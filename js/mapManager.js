// MapManager: Handles map initialization and interactions
export class MapManager {
  constructor(mapId, locationSelectMapId, homeLocation) {
    this.mapId = mapId;
    this.locationSelectMapId = locationSelectMapId;
    this.homeLocation = homeLocation;
    this.map = null;
    this.locationSelectMap = null;
    this.markers = [];
    this.routes = [];
    this.selectedLocation = null;

    this.initMap();
  }

  // Initialize the main map
  initMap() {
    // Create the main map
    this.map = L.map(this.mapId).setView(
      [this.homeLocation.lat, this.homeLocation.lng],
      13
    );

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Add home marker
    this.addHomeMarker();

    // Initialize the location selection map when modal is opened
    document.getElementById("add-task-btn").addEventListener("click", () => {
      // Small delay to ensure modal is visible
      setTimeout(() => this.initLocationSelectMap(), 100);
    });
  }

  // Initialize the location selection map
  initLocationSelectMap() {
    if (this.locationSelectMap) {
      this.locationSelectMap.remove();
    }

    this.locationSelectMap = L.map(this.locationSelectMapId).setView(
      [this.homeLocation.lat, this.homeLocation.lng],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.locationSelectMap);

    // Add click event to select location
    this.locationSelectMap.on("click", (e) => {
      this.selectLocationOnMap(e.latlng);
    });

    // Fix for map rendering issues in modal
    this.locationSelectMap.invalidateSize();
  }

  // Add home marker to the map
  addHomeMarker() {
    const homeIcon = L.divIcon({
      className: "home-marker",
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 21H5a1 1 0 0 1-1-1v-9H1l10.327-9.388a1 1 0 0 1 1.346 0L23 11h-3v9a1 1 0 0 1-1 1zM6 19h12V9.157l-6-5.454-6 5.454V19z" fill="white"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Add marker to map
    const marker = L.marker([this.homeLocation.lat, this.homeLocation.lng], {
      icon: homeIcon,
    }).addTo(this.map);

    // Add popup
    marker.bindPopup(
      '<div class="marker-popup"><h3>Home</h3><p>Starting point for all routes</p></div>'
    );
  }

  // Update task markers on the map
  updateTaskMarkers(tasks) {
    // Clear existing markers
    this.clearMarkers();

    // Add markers for each task
    tasks.forEach((task, index) => {
      const taskIcon = L.divIcon({
        className: task.completed ? "completed-marker" : "task-marker",
        html: task.completed ? "✓" : `<span>${index + 1}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([task.location.lat, task.location.lng], {
        icon: taskIcon,
      }).addTo(this.map);

      // Format time
      const startTime = task.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = task.endTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Create popup content
      const popupContent = `
        <div class="marker-popup">
          <h3>${task.title}</h3>
          <p>${task.description}</p>
          <div class="time">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-8h4v2h-6V7h2v5z"/>
            </svg>
            ${startTime} - ${endTime}
          </div>
          <div class="marker-actions">
            <button class="secondary-btn view-task-btn" data-task-id="${task.id}">View Details</button>
          </div>
        </div>
      `;

      // Bind popup
      marker.bindPopup(popupContent);

      // Store marker reference
      this.markers.push(marker);

      // Add click event to popup buttons
      marker.on("popupopen", () => {
        const viewBtn = document.querySelector(
          `.view-task-btn[data-task-id="${task.id}"]`
        );
        if (viewBtn) {
          viewBtn.addEventListener("click", () => {
            // Close the popup
            marker.closePopup();

            // Dispatch custom event to show task details
            const event = new CustomEvent("showTaskDetails", {
              detail: { taskId: task.id },
            });
            document.dispatchEvent(event);
          });
        }
      });
    });

    // Fit map to markers if there are any
    if (tasks.length > 0) {
      const bounds = [
        [this.homeLocation.lat, this.homeLocation.lng],
        ...tasks.map((task) => [task.location.lat, task.location.lng]),
      ];
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map.setView([this.homeLocation.lat, this.homeLocation.lng], 13);
    }
  }

  // Clear all markers from the map
  clearMarkers() {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  // Update routes on the map
  updateRoutes(tasks) {
    // Clear existing routes
    this.clearRoutes();

    // If no tasks, exit
    if (tasks.length === 0) return;

    // Sort all tasks by start time
    const sortedTasks = [...tasks].sort((a, b) => a.startTime - b.startTime);

    // Find last completed task (if any)
    const lastCompletedTask = [...sortedTasks]
      .reverse()
      .find((task) => task.completed);

    // Get uncompleted tasks that are after the last completed task
    const uncompletedTasks = sortedTasks.filter((task) => !task.completed);

    // If all tasks are completed, show route from last task to home
    if (uncompletedTasks.length === 0) {
      if (lastCompletedTask) {
        const waypoints = [
          L.latLng(
            lastCompletedTask.location.lat,
            lastCompletedTask.location.lng
          ),
          L.latLng(this.homeLocation.lat, this.homeLocation.lng),
        ];
        this.createRoute(waypoints);
      }
      return;
    }

    // Create waypoints starting from last completed task (or home) to next tasks
    const startPoint = lastCompletedTask
      ? L.latLng(lastCompletedTask.location.lat, lastCompletedTask.location.lng)
      : L.latLng(this.homeLocation.lat, this.homeLocation.lng);

    const waypoints = [
      startPoint,
      ...uncompletedTasks.map((task) =>
        L.latLng(task.location.lat, task.location.lng)
      ),
    ];

    // Create route for remaining tasks
    this.createRoute(waypoints);
  }

  // Helper method to create a route between waypoints
  createRoute(waypoints) {
    if (waypoints.length >= 2) {
      const routeControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: false,
        lineOptions: {
          styles: [
            { color: "#3498db", opacity: 0.8, weight: 6 },
            { color: "white", opacity: 0.3, weight: 2 },
          ],
        },
        createMarker: () => null, // Don't create markers as we already have them
      }).addTo(this.map);

      // Hide the instructions container
      routeControl.on("routesfound", function (e) {
        const container = document.querySelector(".leaflet-routing-container");
        if (container) {
          container.style.display = "none";
        }
      });

      this.routes.push(routeControl);
    }
  }

  // Clear all routes from the map
  clearRoutes() {
    this.routes.forEach((route) => {
      this.map.removeControl(route);
    });
    this.routes = [];
  }

  // Select location on the map
  selectLocationOnMap(
    latlng,
    locationName = "Custom Location",
    isPredefined = false
  ) {
    // Clear any existing markers
    if (this.selectedLocationMarker) {
      this.locationSelectMap.removeLayer(this.selectedLocationMarker);
    }

    // Add new marker
    this.selectedLocationMarker = L.marker(latlng).addTo(
      this.locationSelectMap
    );

    // Update selected location
    this.selectedLocation = {
      name: locationName,
      lat: latlng.lat,
      lng: latlng.lng,
    };

    // Get location dropdown
    const locationSelect = document.getElementById("task-location");

    // For predefined locations, keep the dropdown value
    // For custom locations (map clicks), clear the dropdown
    if (!isPredefined) {
      locationSelect.value = "";
    }

    // Always notify about location selection
    const event = new CustomEvent("locationSelected", {
      detail: {
        location: this.selectedLocation,
        isCustom: !isPredefined,
      },
    });
    document.dispatchEvent(event);

    // Center map on selected location
    this.locationSelectMap.setView(latlng, this.locationSelectMap.getZoom());
  }

  // Get the selected location
  getSelectedLocation() {
    return this.selectedLocation;
  }

  // Reset the selected location and all related UI
  resetSelectedLocation() {
    // Reset internal state
    this.selectedLocation = null;

    // Clear marker if it exists
    if (this.selectedLocationMarker && this.locationSelectMap) {
      this.locationSelectMap.removeLayer(this.selectedLocationMarker);
      this.selectedLocationMarker = null;
    }

    // Reset dropdown if it exists
    const locationSelect = document.getElementById("task-location");
    if (locationSelect) {
      locationSelect.value = "";
    }

    // Notify that location has been reset
    const event = new CustomEvent("locationSelected", {
      detail: {
        location: null,
        isReset: true,
      },
    });
    document.dispatchEvent(event);
  }
}
