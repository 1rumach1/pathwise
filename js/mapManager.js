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
    this.transportMode = "auto";

    this.initMap();
    this.initTransportControls();
    this.initLocationSelectMap();
  }

  initMap() {
    this.map = L.map(this.mapId).setView(
      [this.homeLocation.lat, this.homeLocation.lng],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    const transportControl = L.control({ position: "topright" });
    transportControl.onAdd = () => {
      const div = L.DomUtil.create(
        "div",
        "transport-control leaflet-bar leaflet-control"
      );
      div.innerHTML = `
        <select id="transport-mode" class="transport-select">
          <option value="auto">Car</option>
          <option value="bicycle">Bike</option>
          <option value="pedestrian">Walk</option>
        </select>
      `;
      return div;
    };
    transportControl.addTo(this.map);

    this.addHomeMarker();
  }

  initTransportControls() {
    document
      .getElementById("transport-mode")
      .addEventListener("change", (e) => {
        this.clearRoutes();
        this.transportMode = e.target.value;
        if (window.taskManager) {
          this.updateRoutes(window.taskManager.getTodayTasks());
        }
      });
  }

  initLocationSelectMap() {
    if (this.locationSelectMap) {
      this.locationSelectMap.invalidateSize();
      return this.locationSelectMap;
    }

    const container = document.getElementById(this.locationSelectMapId);
    if (!container) return null;

    this.locationSelectMap = L.map(this.locationSelectMapId).setView(
      [this.homeLocation.lat, this.homeLocation.lng],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.locationSelectMap);

    this.locationSelectMap.on("click", (e) => {
      this.selectLocationOnMap(e.latlng);
    });

    return this.locationSelectMap;
  }

  addHomeMarker() {
    const homeIcon = L.divIcon({
      className: "home-marker",
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 21H5a1 1 0 0 1-1-1v-9H1l10.327-9.388a1 1 0 0 1 1.346 0L23 11h-3v9a1 1 0 0 1-1 1zM6 19h12V9.157l-6-5.454-6 5.454V19z" fill="white"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const marker = L.marker([this.homeLocation.lat, this.homeLocation.lng], {
      icon: homeIcon,
    }).addTo(this.map);

    marker.bindPopup(
      '<div class="marker-popup"><h3>Home</h3><p>Starting point for all routes</p></div>'
    );
  }

  decodePolyline(str, precision) {
    precision = Math.pow(10, -precision);
    var coordinates = [];
    var index = 0;
    var lat = 0;
    var lng = 0;

    while (index < str.length) {
      var result = 1;
      var shift = 0;
      var b;
      do {
        b = str.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);
      lat += (result & 1 ? ~(result >> 1) : result >> 1) * precision;

      result = 1;
      shift = 0;
      do {
        b = str.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f);
      lng += (result & 1 ? ~(result >> 1) : result >> 1) * precision;

      coordinates.push([lat, lng]);
    }
    return coordinates;
  }

  updateTaskMarkers(tasks) {
    // Clear existing markers
    this.clearMarkers();

    // Sort tasks by start time
    const sortedTasks = [...tasks].sort((a, b) => a.startTime - b.startTime);

    // Find all completed tasks
    const completedTasks = sortedTasks.filter((task) => task.completed);
    const uncompletedTasks = sortedTasks.filter((task) => !task.completed);

    // Add markers for completed tasks first
    completedTasks.forEach((task) => {
      this.addCompletedTaskMarker(task);
    });

    // Add markers for uncompleted tasks
    uncompletedTasks.forEach((task, index) => {
      const taskIcon = L.divIcon({
        className: "task-marker",
        html: `<span>${index + 1}</span>`,
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

    // Fit map to all markers and home location
    const allPoints = [
      [this.homeLocation.lat, this.homeLocation.lng],
      ...tasks.map((task) => [task.location.lat, task.location.lng]),
    ];

    if (allPoints.length > 1) {
      this.map.fitBounds(allPoints, { padding: [50, 50] });
    } else {
      // If no points (or just home), center on home location
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

  // Add a marker for the last completed task
  addCompletedTaskMarker(task) {
    console.log("Adding completed task marker for:", task); // Debug log

    const completedIcon = L.divIcon({
      className: "completed-marker",
      html: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-.997-4L6.76 11.757l1.414-1.414 2.829 2.829 5.656-5.657 1.415 1.414L11.003 16z" fill="white"/>
              </svg>
            </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (
      !task.location ||
      typeof task.location.lat !== "number" ||
      typeof task.location.lng !== "number"
    ) {
      console.error("Invalid task location:", task.location); // Debug log
      return;
    }

    const marker = L.marker([task.location.lat, task.location.lng], {
      icon: completedIcon,
    }).addTo(this.map);

    console.log("Completed task marker added at:", task.location); // Debug log

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
          ${startTime} - ${endTime} (Completed)
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    this.markers.push(marker);
    console.log(
      "Total markers after adding completed task:",
      this.markers.length
    ); // Debug log
  }

  // Update routes on the map
  updateRoutes(tasks) {
    // Clear existing routes
    this.clearRoutes();

    // If no tasks, exit
    if (tasks.length === 0) return;

    // Sort tasks by start time
    const sortedTasks = [...tasks].sort((a, b) => a.startTime - b.startTime);

    // Get uncompleted tasks
    const uncompletedTasks = sortedTasks.filter((task) => !task.completed);
    if (uncompletedTasks.length === 0) {
      // All tasks completed, no routes to show
      return;
    }

    // Find the last completed task to use as starting point
    const lastCompletedTask = [...sortedTasks]
      .reverse()
      .find((task) => task.completed);

    // Determine starting point
    const startPoint = lastCompletedTask
      ? [lastCompletedTask.location.lng, lastCompletedTask.location.lat]
      : [this.homeLocation.lng, this.homeLocation.lat];

    // Create route segments starting from current position
    const routeSegments = [];
    let previousPoint = startPoint;

    // Create segments only for uncompleted tasks
    uncompletedTasks.forEach((task) => {
      routeSegments.push([
        previousPoint,
        [task.location.lng, task.location.lat],
      ]);
      previousPoint = [task.location.lng, task.location.lat];
    });

    // Fetch and draw each route segment
    routeSegments.forEach((coordinates) => {
      fetch(
        "https://api.openrouteservice.org/v2/directions/" +
          this.getOrsProfile(),
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization:
              "5b3ce3597851110001cf6248377240f3c70c449281c08a64f445837c",
          },
          body: JSON.stringify({
            coordinates: coordinates,
            instructions: false,
            preference: "shortest",
          }),
        }
      )
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouteService Error Response:", errorData);
            throw new Error(errorData.error || "Route calculation failed");
          }
          return response.json();
        })
        .then((data) => {
          if (!data.routes?.[0]?.geometry) {
            console.error("No geometry in route:", data);
            return;
          }

          // Decode and draw the route segment
          const decodedGeometry = this.decodePolyline(
            data.routes[0].geometry,
            5
          );
          const routeColor = this.getRouteColor();
          const route = L.polyline(decodedGeometry, {
            color: routeColor,
            weight: 6,
            opacity: 0.8,
          }).addTo(this.map);

          this.routes.push(route);
        })
        .catch((error) => {
          console.error("Failed to get route:", error);
        });
    });
  }

  // Get OpenRouteService profile based on transport mode
  getOrsProfile() {
    console.log("Current transport mode:", this.transportMode); // Debug log
    switch (this.transportMode) {
      case "bicycle":
        return "cycling-regular";
      case "pedestrian":
        return "foot-walking";
      case "auto":
      default:
        return "driving-car";
    }
  }

  // Get route color based on transport mode
  getRouteColor() {
    switch (this.transportMode) {
      case "bicycle":
        return "#2ecc71"; // Green for bike
      case "pedestrian":
        return "#e74c3c"; // Red for walking
      case "auto":
      default:
        return "#3498db"; // Blue for car
    }
  }

  // Clear all routes from the map
  clearRoutes() {
    this.routes.forEach((route) => {
      this.map.removeLayer(route);
    });
    this.routes = [];
  }

  // Select location on the map
  selectLocationOnMap(
    latlng,
    locationName = "Custom Location",
    isPredefined = false
  ) {
    // Initialize map if not initialized
    this.initLocationSelectMap();

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

    // Only dispatch event for custom locations
    if (!isPredefined) {
      const locationSelect = document.getElementById("task-location");
      locationSelect.value = "";

      // Dispatch custom event for manual selection
      const event = new CustomEvent("locationSelected", {
        detail: { location: this.selectedLocation },
      });
      document.dispatchEvent(event);
    }
  }

  // Get the selected location
  getSelectedLocation() {
    return this.selectedLocation;
  }

  // Reset the selected location
  resetSelectedLocation() {
    this.selectedLocation = null;
    if (this.selectedLocationMarker && this.locationSelectMap) {
      this.locationSelectMap.removeLayer(this.selectedLocationMarker);
      this.selectedLocationMarker = null;
    }
  }
}
