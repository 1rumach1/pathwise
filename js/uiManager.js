// UIManager: Handles UI interactions and rendering
import { formatDate, formatTime, isToday, isFuture, isPast } from "./utils.js";

export class UIManager {
  constructor(taskManager, mapManager, locations) {
    this.taskManager = taskManager;
    this.mapManager = mapManager;
    this.locations = locations;
    this.currentView = "all";
    this.editingTaskId = null;
    this.selectedLocation = null;
  }

  // Initialize UI and set up event listeners
  initialize() {
    // Populate location dropdown
    this.populateLocationDropdown();

    // Set up event listeners
    this.setupEventListeners();
  }

  // Set up all event listeners
  setupEventListeners() {
    // Modal controls
    document
      .getElementById("add-task-btn")
      .addEventListener("click", () => this.openTaskModal());
    document
      .getElementById("close-modal")
      .addEventListener("click", () => this.closeTaskModal());
    document
      .getElementById("cancel-task")
      .addEventListener("click", () => this.closeTaskModal());

    // Task form submission
    document
      .getElementById("task-form")
      .addEventListener("submit", (e) => this.handleTaskSubmit(e));

    // View controls
    document
      .getElementById("view-all")
      .addEventListener("click", () => this.changeView("all"));
    document
      .getElementById("view-today")
      .addEventListener("click", () => this.changeView("today"));
    document
      .getElementById("view-upcoming")
      .addEventListener("click", () => this.changeView("upcoming"));
    document
      .getElementById("view-unfinished")
      .addEventListener("click", () => this.changeView("unfinished"));
    document
      .getElementById("view-passed")
      .addEventListener("click", () => this.changeView("passed"));
    document
      .getElementById("view-completed")
      .addEventListener("click", () => this.changeView("completed"));

    // Task completion delegation
    document
      .getElementById("tasks-container")
      .addEventListener("click", (e) => {
        if (e.target.classList.contains("task-checkbox")) {
          e.stopPropagation();
          const taskCard = e.target.closest(".task-card");
          if (taskCard) {
            const taskId = taskCard.dataset.taskId;
            this.toggleTaskCompletion(taskId);
          }
        }
      });

    // Search functionality
    document
      .getElementById("search-input")
      .addEventListener("input", (e) => this.handleSearch(e));
    document
      .getElementById("search-btn")
      .addEventListener("click", () => this.handleSearch());

    // Task details modal
    document
      .getElementById("close-details")
      .addEventListener("click", () => this.closeTaskDetailsModal());
    document
      .getElementById("edit-task")
      .addEventListener("click", () => this.editCurrentTask());
    document
      .getElementById("delete-task")
      .addEventListener("click", () => this.deleteCurrentTask());

    // Location selection
    document.getElementById("task-location").addEventListener("change", (e) => {
      const locationId = e.target.value;
      if (locationId) {
        const location = this.locations.find((loc) => loc.id === locationId);
        if (location) {
          this.selectedLocation = location;
          // Add marker for selected predefined location
          const latlng = { lat: location.lat, lng: location.lng };
          this.mapManager.selectLocationOnMap(latlng, location.name, true); // true indicates predefined location
          // Pan the map to the selected location
          this.mapManager.locationSelectMap.setView(latlng, 15);
        }
      } else {
        this.mapManager.resetSelectedLocation();
      }
    });

    // Custom location selection
    document.addEventListener("locationSelected", (e) => {
      this.selectedLocation = e.detail.location;
      const locationSelect = document.getElementById("task-location");
      locationSelect.value = "";
    });

    // Show task details from map marker
    document.addEventListener("showTaskDetails", (e) => {
      this.showTaskDetails(e.detail.taskId);
    });

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      const taskModal = document.getElementById("task-modal");
      const detailsModal = document.getElementById("task-details-modal");

      if (e.target === taskModal) {
        this.closeTaskModal();
      } else if (e.target === detailsModal) {
        this.closeTaskDetailsModal();
      }
    });
  }

  // Populate the location dropdown
  populateLocationDropdown() {
    const locationSelect = document.getElementById("task-location");

    // Clear existing options
    locationSelect.innerHTML =
      '<option value="" disabled selected>Select a location</option>';

    // Add locations to dropdown
    this.locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location.id;
      option.textContent = location.name;
      locationSelect.appendChild(option);
    });
  }

  // Open the task modal
  openTaskModal() {
    const modal = document.getElementById("task-modal");
    modal.classList.add("active");

    // Reset form
    document.getElementById("task-form").reset();

    // Set default dates
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("task-start-date").value = today;
    document.getElementById("task-end-date").value = today;

    // Reset selected location
    this.selectedLocation = null;
    this.mapManager.resetSelectedLocation();

    // Initialize/refresh map after modal animation
    setTimeout(() => {
      const map = this.mapManager.initLocationSelectMap();
      if (map) {
        map.invalidateSize();
      }
    }, 100);

    // Reset editing state
    this.editingTaskId = null;
  }

  // Close the task modal
  closeTaskModal() {
    const modal = document.getElementById("task-modal");
    modal.classList.remove("active");

    // Reset form and selected location
    document.getElementById("task-form").reset();
    this.selectedLocation = null;
    this.mapManager.resetSelectedLocation();
  }

  // Handle task form submission
  handleTaskSubmit(e) {
    e.preventDefault();

    // Get form data
    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-description").value;
    const startDate = document.getElementById("task-start-date").value;
    const startTime = document.getElementById("task-start-time").value;
    const endDate = document.getElementById("task-end-date").value;
    const endTime = document.getElementById("task-end-time").value;

    // Create Date objects
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    // Get location
    let location;
    const locationSelect = document.getElementById("task-location");

    if (this.selectedLocation) {
      // Use selected location from map or previously selected
      location = this.selectedLocation;
    } else if (locationSelect.value) {
      // Use selected location from dropdown
      location = this.locations.find((loc) => loc.id === locationSelect.value);
    } else {
      // Show error if no location selected
      alert("Please select a location");
      return;
    }

    // Create task object
    const taskData = {
      title,
      description,
      startTime: startDateTime,
      endTime: endDateTime,
      location,
    };

    // Add or update task
    if (this.editingTaskId) {
      this.taskManager.updateTask(this.editingTaskId, taskData);
    } else {
      this.taskManager.addTask(taskData);
    }

    // Close modal
    this.closeTaskModal();

    // Update UI
    this.renderTasks();
    this.mapManager.updateTaskMarkers(this.taskManager.getTodayTasks());
    this.mapManager.updateRoutes(this.taskManager.getTodayTasks());
  }

  // Change the current view
  changeView(view) {
    this.currentView = view;

    // Update active button
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.getElementById(`view-${view}`).classList.add("active");

    // Update section header text
    const headerText = document.getElementById("task-section-header");
    switch (view) {
      case "today":
        headerText.textContent = "Today's Tasks";
        break;
      case "upcoming":
        headerText.textContent = "Upcoming Tasks";
        break;
      case "unfinished":
        headerText.textContent = "Unfinished Tasks";
        break;
      case "passed":
        headerText.textContent = "Passed Tasks";
        break;
      case "completed":
        headerText.textContent = "Completed Tasks";
        break;
      case "all":
      default:
        headerText.textContent = "All Tasks";
        break;
    }

    // Render tasks for the selected view
    this.renderTasks();

    // Update map for today view - only show unfinished tasks on map
    if (view === "today") {
      const tasksForMap = this.taskManager
        .getTodayTasks()
        .filter((task) => !task.completed);
      this.mapManager.updateTaskMarkers(tasksForMap);
      this.mapManager.updateRoutes(tasksForMap);
    } else {
      // Clear markers and routes for non-today views
      this.mapManager.clearMarkers();
      this.mapManager.clearRoutes();
    }
  }

  // Handle search
  handleSearch(e) {
    const query = document.getElementById("search-input").value;
    let tasks;

    // Get base tasks depending on current view
    switch (this.currentView) {
      case "today":
        tasks = this.taskManager.getTodayTasks();
        break;
      case "upcoming":
        tasks = this.taskManager.getUpcomingTasks();
        break;
      case "unfinished":
        tasks = this.taskManager.getUnfinishedTasks();
        break;
      case "passed":
        tasks = this.taskManager.getPassedTasks();
        break;
      case "completed":
        tasks = this.taskManager.getCompletedTasks();
        break;
      case "all":
      default:
        tasks = this.taskManager.getAllTasks();
        break;
    }

    // Filter tasks by search query
    if (query && query.trim() !== "") {
      const searchTerm = query.toLowerCase().trim();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.description.toLowerCase().includes(searchTerm)
      );
    }

    // Render filtered tasks
    this.renderTaskList(tasks);

    // Update map if we're in today view
    if (this.currentView === "today") {
      const tasksForMap = tasks.filter((task) => !task.completed);
      this.mapManager.updateTaskMarkers(tasksForMap);
      this.mapManager.updateRoutes(tasksForMap);
    }
  }

  // Toggle task completion status
  toggleTaskCompletion(taskId) {
    // Toggle completion in task manager
    if (this.taskManager.toggleTaskCompletion(taskId)) {
      // Re-render tasks
      this.renderTasks();

      // Get all today's tasks for the map
      const todayTasks = this.taskManager.getTodayTasks();

      // Update markers and routes
      this.mapManager.updateTaskMarkers(todayTasks);
      this.mapManager.updateRoutes(todayTasks);
    }
  }

  // Render tasks based on current view
  renderTasks() {
    let tasks;

    switch (this.currentView) {
      case "today":
        tasks = this.taskManager.getTodayTasks();
        break;
      case "upcoming":
        tasks = this.taskManager.getUpcomingTasks();
        break;
      case "unfinished":
        tasks = this.taskManager.getUnfinishedTasks();
        break;
      case "passed":
        tasks = this.taskManager.getPassedTasks();
        break;
      case "completed":
        tasks = this.taskManager
          .getCompletedTasks()
          .sort((a, b) => b.endTime - a.endTime); // Sort most recent first
        break;
      case "all":
      default:
        tasks = this.taskManager.getAllTasks();
        break;
    }

    this.renderTaskList(tasks);
  }

  // Render task list
  renderTaskList(tasks) {
    const tasksContainer = document.getElementById("tasks-container");

    // Clear container
    tasksContainer.innerHTML = "";

    // Show message if no tasks
    if (tasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M20 22H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1zm-1-2V4H5v16h14zM8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"/>
          </svg>
          <h3>No tasks found</h3>
          <p>Add a new task to get started</p>
          <button id="empty-add-task" class="primary-btn">Add Task</button>
        </div>
      `;

      // Add event listener for empty state button
      document
        .getElementById("empty-add-task")
        .addEventListener("click", () => {
          this.openTaskModal();
        });

      return;
    }

    // Render each task
    tasks.forEach((task) => {
      // Create task card
      const taskCard = document.createElement("div");
      taskCard.className = `task-card${task.completed ? " completed" : ""}`;
      taskCard.dataset.taskId = task.id;

      // Determine badge class based on date
      let badgeClass = "";
      let badgeText = "";

      if (isToday(task.startTime)) {
        badgeClass = "today";
        badgeText = "Today";
      } else if (isFuture(task.startTime)) {
        badgeClass = "upcoming";
        badgeText = formatDate(task.startTime);
      } else {
        badgeClass = "past";
        badgeText = "Past";
      }

      // Format task card
      taskCard.innerHTML = `
        <div class="task-badge ${badgeClass}">${badgeText}</div>
        <div class="task-title-container">
          <input type="checkbox" class="task-checkbox" ${
            task.completed ? "checked" : ""
          }>
          <div class="task-title">${task.title}</div>
        </div>
        <div class="task-description">${task.description}</div>
        <div class="task-meta">
          <div class="task-time">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-8h4v2h-6V7h2v5z"/>
            </svg>
            ${formatTime(task.startTime)} - ${formatTime(task.endTime)}
          </div>
          <div class="task-location">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path d="M12 20.9l4.95-4.95a7 7 0 1 0-9.9 0L12 20.9zm0 2.828l-6.364-6.364a9 9 0 1 1 12.728 0L12 23.728zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
            </svg>
            ${task.location.name}
          </div>
        </div>
      `;

      // Add click event to show task details
      taskCard.addEventListener("click", (e) => {
        // Don't show details if clicking the checkbox
        if (!e.target.classList.contains("task-checkbox")) {
          this.showTaskDetails(task.id);
        }
      });

      // Add to container
      tasksContainer.appendChild(taskCard);
    });
  }

  // Show task details modal
  showTaskDetails(taskId) {
    const task = this.taskManager.getTaskById(taskId);
    if (!task) return;

    // Set current task ID
    this.editingTaskId = taskId;

    // Populate modal
    document.getElementById("detail-title").textContent = task.title;
    document.getElementById("detail-description").textContent =
      task.description;
    document.getElementById("detail-start").textContent = `${formatDate(
      task.startTime
    )} at ${formatTime(task.startTime)}`;
    document.getElementById("detail-end").textContent = `${formatDate(
      task.endTime
    )} at ${formatTime(task.endTime)}`;
    document.getElementById("detail-location").textContent = task.location.name;

    // Show modal
    const modal = document.getElementById("task-details-modal");
    modal.classList.add("active");
  }

  // Close task details modal
  closeTaskDetailsModal() {
    const modal = document.getElementById("task-details-modal");
    modal.classList.remove("active");
    this.editingTaskId = null;
  }

  // Edit current task
  editCurrentTask() {
    // Get task data
    const task = this.taskManager.getTaskById(this.editingTaskId);
    if (!task) return;

    // Close details modal
    this.closeTaskDetailsModal();

    // Open task modal
    this.openTaskModal();

    // Populate form with task data
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description;

    // Format dates and times
    const startDate = task.startTime.toISOString().split("T")[0];
    const startTime = task.startTime.toTimeString().substring(0, 5);
    const endDate = task.endTime.toISOString().split("T")[0];
    const endTime = task.endTime.toTimeString().substring(0, 5);

    document.getElementById("task-start-date").value = startDate;
    document.getElementById("task-start-time").value = startTime;
    document.getElementById("task-end-date").value = endDate;
    document.getElementById("task-end-time").value = endTime;

    // Set location
    this.selectedLocation = task.location;

    // If location is from predefined list, select it in dropdown
    const locationMatch = this.locations.find(
      (loc) =>
        loc.name === task.location.name &&
        loc.lat === task.location.lat &&
        loc.lng === task.location.lng
    );

    if (locationMatch) {
      document.getElementById("task-location").value = locationMatch.id;
    } else {
      document.getElementById("task-location").value = "";
    }

    // Set editing state
    this.editingTaskId = task.id;
  }

  // Delete current task
  deleteCurrentTask() {
    if (confirm("Are you sure you want to delete this task?")) {
      this.taskManager.deleteTask(this.editingTaskId);

      // Close modal
      this.closeTaskDetailsModal();

      // Update UI
      this.renderTasks();
      this.mapManager.updateTaskMarkers(this.taskManager.getTodayTasks());
      this.mapManager.updateRoutes(this.taskManager.getTodayTasks());
    }
  }
}
