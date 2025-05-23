// TaskManager: Handles all task-related operations
export class TaskManager {
  constructor() {
    this.tasks = this.loadTasks();
  }
  
  // Load tasks from localStorage
  loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const parsedTasks = JSON.parse(storedTasks);
      // Convert string dates back to Date objects
      return parsedTasks.map(task => ({
        ...task,
        startTime: new Date(task.startTime),
        endTime: new Date(task.endTime)
      }));
    }
    return [];
  }
  
  // Save tasks to localStorage
  saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }
  
  // Get all tasks
  getAllTasks() {
    return [...this.tasks];
  }
  
  // Get tasks for today
  getTodayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return taskDate >= today && taskDate < tomorrow;
    }).sort((a, b) => a.startTime - b.startTime);
  }
  
  // Get upcoming tasks (future tasks excluding today)
  getUpcomingTasks() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return taskDate >= tomorrow;
    }).sort((a, b) => a.startTime - b.startTime);
  }
  
  // Add a new task
  addTask(task) {
    // Generate a unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Create a new task object with the ID
    const newTask = {
      id,
      title: task.title,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      location: task.location
    };
    
    // Add to tasks array
    this.tasks.push(newTask);
    
    // Save tasks to localStorage
    this.saveTasks();
    
    // Return the new task
    return newTask;
  }
  
  // Update an existing task
  updateTask(id, updatedTask) {
    const index = this.tasks.findIndex(task => task.id === id);
    
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        ...updatedTask
      };
      
      this.saveTasks();
      return true;
    }
    
    return false;
  }
  
  // Delete a task
  deleteTask(id) {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== id);
    
    if (this.tasks.length !== initialLength) {
      this.saveTasks();
      return true;
    }
    
    return false;
  }
  
  // Search tasks by title (case insensitive)
  searchTasks(query) {
    if (!query || query.trim() === '') {
      return this.getAllTasks();
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return this.tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm)
    );
  }
  
  // Get a specific task by ID
  getTaskById(id) {
    return this.tasks.find(task => task.id === id);
  }
}