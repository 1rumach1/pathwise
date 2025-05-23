// Main entry point for the application
import { TaskManager } from './taskManager.js';
import { MapManager } from './mapManager.js';
import { UIManager } from './uiManager.js';
import { locations } from './locationData.js';
import { formatDate, formatTime, isToday, isFuture, isPast } from './utils.js';

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Home location (Balibago, Rosario Batangas)
  const homeLocation = {
    name: 'Home',
    lat: 13.8401,
    lng: 121.2023
  };
  
  // Initialize managers
  const taskManager = new TaskManager();
  const mapManager = new MapManager('map', 'location-select-map', homeLocation);
  const uiManager = new UIManager(taskManager, mapManager, locations);
  
  // Set up initial UI
  uiManager.initialize();
  
  // Add some example tasks if none exist
  if (taskManager.getAllTasks().length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);
    
    const today = new Date();
    today.setHours(14, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(15, 30, 0, 0);
    
    const laterToday = new Date();
    laterToday.setHours(17, 0, 0, 0);
    
    const laterTodayEnd = new Date(laterToday);
    laterTodayEnd.setHours(18, 0, 0, 0);
    
    taskManager.addTask({
      title: 'Shopping at SM Lipa',
      description: 'Buy new clothes and groceries',
      startTime: today,
      endTime: todayEnd,
      location: locations[0]
    });
    
    taskManager.addTask({
      title: 'Visit Padre Pio Shrine',
      description: 'Afternoon prayer and meditation',
      startTime: laterToday,
      endTime: laterTodayEnd,
      location: locations[7]
    });
    
    taskManager.addTask({
      title: 'Market Day in Rosario',
      description: 'Buy fresh vegetables and fruits',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      location: locations[5]
    });
  }
  
  // Render tasks and update map
  uiManager.renderTasks();
  mapManager.updateTaskMarkers(taskManager.getTodayTasks());
  mapManager.updateRoutes(taskManager.getTodayTasks());
});