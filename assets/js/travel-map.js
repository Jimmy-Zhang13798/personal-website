// World travel globe: highlights visited countries and pins places from _data/travel.yml

(function() {
  const root = document.getElementById("travel-map");
  const dataEl = document.getElementById("travel-map-data");
  if (!root || !dataEl) return;

  // other spellings people commonly use -> names used in the world map data
  const ALIASES = {
    "usa": "United States of America",
    "us": "United States of America",
    "united states": "United States of America",
    "uk": "United Kingdom",
    "great britain": "United Kingdom",
    "england": "United Kingdom",
    "czech republic": "Czechia",
    "korea": "South Korea",
    "macau": "Macao",
    "north macedonia": "Macedonia",
    "bosnia and herzegovina": "Bosnia and Herz.",
    "dominican republic": "Dominican Rep.",
    "uae": "United Arab Emirates",
    "türkiye": "Turkey",
    "turkiye": "Turkey",
    "swaziland": "eSwatini",
    "cape verde": "Cabo Verde",
    "ivory coast": "Côte d'Ivoire",
    "burma": "Myanmar",
    "east timor": "Timor-Leste",
    "vatican city": "Vatican",
    "faroe islands": "Faeroe Is.",
    "dr congo": "Dem. Rep. Congo",
    "south sudan": "S. Sudan"
  };

  const DEGREES = 180 / Math.PI;
  const MAX_ZOOM = 10;
  const MAX_TILT = 80;
  const PIN_RADIUS = 4.5;
  const DOT_RADIUS = 3.5;
  // visited countries drawn smaller than this (in px²) also get a dot
  const TINY_AREA = 12;
  // the detailed outlines come back this long (ms) after the globe stops moving
  const SETTLE_DELAY = 160;

  const entries = (JSON.parse(dataEl.textContent) || []).filter(Boolean);
  const stage = root.querySelector(".travel-map-stage");
  const canvas = root.querySelector(".travel-map-canvas");
  const tooltip = root.querySelector(".travel-map-tooltip");
  const svg = d3.select(stage).select("svg");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Promise.all([root.dataset.world, root.dataset.worldLow].map(function(url) {
    return fetch(url).then(function(response) { return response.json(); });
  })).then(function(worlds) { draw(worlds[0], worlds[1]); });

  function draw(world, worldLow) {
    // every country has detailed outlines and, where the coarse file has them,
    // light ones that are cheap enough to redraw on every frame of a spin
    const lowByName = new Map(topojson.feature(worldLow, worldLow.objects.countries).features
      .map(function(feature) { return [feature.properties.name, feature]; }));
    const countries = topojson.feature(world, world.objects.countries).features.map(function(feature) {
      const name = feature.properties.name;
      return { name: name, high: feature, low: lowByName.get(name) || feature, area: d3.geoArea(feature) };
    });

    // match the entries of _data/travel.yml to countries of the map
    const byName = new Map(countries.map(function(c) { return [c.name.toLowerCase(), c]; }));
    const unknown = new Set();
    entries.forEach(function(entry) {
      if (!entry.country) return;
      const label = String(entry.country).trim();
      const country = byName.get(label.toLowerCase()) || byName.get((ALIASES[label.toLowerCase()] || "").toLowerCase());
      if (!country) {
        unknown.add(label);
      } else if (!country.label) {
        country.label = label; // the name as written in travel.yml
      }
    });
    const visited = countries
      .filter(function(c) { return c.label; })
      .sort(function(a, b) { return d3.ascending(a.label, b.label); });
    const others = countries.filter(function(c) { return !c.label; });
    visited.forEach(function(c) {
      // the largest piece stands for the country, so that far-away islands
      // and overseas territories don't drag the view out
      const main = mainPiece(c.high);
      const box = d3.geoBounds(main);
      const lonSpan = (box[1][0] - box[0][0] + 360) % 360;
      const latSpan = box[1][1] - box[0][1];
      c.centre = d3.geoCentroid(main);
      c.span = Math.max(lonSpan * Math.cos(c.centre[1] / DEGREES), latSpan);
    });
    const places = entries.filter(function(entry) {
      return entry.lat !== null && entry.lon !== null &&
        Number.isFinite(Number(entry.lat)) && Number.isFinite(Number(entry.lon));
    });

    const projection = d3.geoOrthographic().clipAngle(90).precision(0.3);
    const path = d3.geoPath(projection);
    const graticuleLines = d3.geoGraticule10();

    // view state
    const home = homeView();
    let width = 0;
    let height = 0;
    let radius = 0;
    let zoom = 1;
    let rotation = home.rotation.slice();

    const defs = svg.append("defs");
    gradient("travel-map-ocean", { cx: "35%", cy: "30%", r: "80%" }, [[0, "ocean-light"], [1, "ocean-dark"]]);
    gradient("travel-map-halo", {}, [[0.84, "halo-inner"], [1, "halo-outer"]]);
    gradient("travel-map-shade", { cx: "38%", cy: "32%", r: "75%" }, [[0.55, "shade-inner"], [1, "shade-outer"]]);

    const halo = svg.append("circle").attr("class", "halo").attr("fill", "url(#travel-map-halo)");
    const sphere = svg.append("circle").attr("class", "sphere").attr("fill", "url(#travel-map-ocean)");
    const graticule = svg.append("path").attr("class", "graticule");

    svg.append("g")
      .selectAll("path")
      .data(others)
      .join("path")
      .attr("class", "country")
      .call(describe);

    const visitedLayer = svg.append("g").attr("class", "visited-layer");
    visitedLayer.selectAll("path")
      .data(visited)
      .join("path")
      .attr("class", "country visited")
      .style("--i", function(c, i) { return i; })
      .call(describe);
    const outlines = svg.selectAll("path.country");

    const dots = visitedLayer.selectAll("circle")
      .data(visited)
      .join("circle")
      .attr("class", "country-dot")
      .style("--i", function(c, i) { return i; })
      .attr("r", DOT_RADIUS)
      .call(describe);

    const pins = svg.append("g")
      .selectAll("circle")
      .data(places)
      .join("circle")
      .attr("class", "place")
      .attr("r", PIN_RADIUS)
      .on("pointerenter pointermove click", function(event, place) {
        if (dragging) return;
        showTooltip(event, [place.name, place.country].filter(Boolean).join(", "), [place.date, place.note]);
      })
      .on("pointerleave", hideTooltip);

    const shade = svg.append("circle").attr("class", "shade").attr("fill", "url(#travel-map-shade)");

    // --- drawing ---

    function render(light) {
      const scale = radius * zoom;
      const centre = [-rotation[0], -rotation[1]];
      projection.rotate(rotation).scale(scale).translate([width / 2, height / 2]);

      halo.attr("cx", width / 2).attr("cy", height / 2).attr("r", scale * 1.19);
      sphere.attr("cx", width / 2).attr("cy", height / 2).attr("r", scale);
      shade.attr("cx", width / 2).attr("cy", height / 2).attr("r", scale);
      graticule.attr("d", path(graticuleLines));
      outlines.attr("d", function(c) { return path(light ? c.low : c.high); });

      // the dot gives way to the real outline once that is large enough to see
      dots.each(function(c) {
        const shown = c.area * scale * scale < TINY_AREA && facing(c.centre, centre);
        position(this, shown && projection(c.centre));
      });
      pins.each(function(p) {
        const point = [Number(p.lon), Number(p.lat)];
        position(this, facing(point, centre) && projection(point));
      });
    }

    function facing(point, centre) {
      return d3.geoDistance(point, centre) < Math.PI / 2;
    }

    function position(circle, point) {
      if (point) {
        circle.setAttribute("cx", point[0]);
        circle.setAttribute("cy", point[1]);
        circle.removeAttribute("display");
      } else {
        circle.setAttribute("display", "none");
      }
    }

    // redraw with the light outlines now, and with the detailed ones once things settle
    let frame = 0;
    let settleTimer = 0;
    function moved() {
      hideTooltip();
      svg.classed("moving", true);
      if (!frame) {
        frame = requestAnimationFrame(function() {
          frame = 0;
          render(true);
        });
      }
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function() {
        svg.classed("moving", false);
        render(false);
      }, SETTLE_DELAY);
    }

    function resize() {
      if (!stage.clientWidth || !stage.clientHeight) return;
      width = stage.clientWidth;
      height = stage.clientHeight;
      radius = Math.min(width, height) / 2 - (width < 500 ? 12 : 26);
      svg.attr("viewBox", [0, 0, width, height]);
      render(false);
    }

    // --- moving the globe ---

    let motion = null; // the running glide or flight, if any
    function stopMotion() {
      if (motion) motion.stop();
      motion = null;
    }

    function rotateBy(degrees) {
      rotation[0] += degrees[0];
      rotation[1] = clamp(rotation[1] + degrees[1], -MAX_TILT, MAX_TILT);
    }

    function zoomTo(value) {
      zoom = clamp(value, 1, MAX_ZOOM);
      moved();
    }

    // animate to a view, turning the short way round
    function fly(target, duration) {
      stopMotion();
      const from = { rotation: rotation.slice(), zoom: zoom };
      const turn = ((target.rotation[0] - from.rotation[0]) % 360 + 540) % 360 - 180;
      const goal = clamp(target.zoom, 1, MAX_ZOOM);
      const step = function(t) {
        const eased = d3.easeCubicInOut(t);
        rotation = [
          from.rotation[0] + turn * eased,
          from.rotation[1] + (target.rotation[1] - from.rotation[1]) * eased
        ];
        zoom = from.zoom * Math.pow(goal / from.zoom, eased);
        moved();
      };
      if (reducedMotion || !duration) return step(1);
      motion = d3.timer(function(elapsed) {
        const t = Math.min(1, elapsed / duration);
        step(t);
        if (t === 1) stopMotion();
      });
    }

    // keep spinning for a moment after a flick
    function glide(velocity) {
      stopMotion();
      let last = performance.now();
      motion = d3.timer(function() {
        const now = performance.now();
        const dt = Math.min(now - last, 50);
        last = now;
        const friction = Math.pow(0.95, dt / 16);
        velocity = [velocity[0] * friction, velocity[1] * friction];
        rotateBy([velocity[0] * dt, velocity[1] * dt]);
        moved();
        if (Math.hypot(velocity[0], velocity[1]) < 0.004) stopMotion();
      });
    }

    // one pointer turns the globe, two pointers pinch to zoom
    const pointers = new Map();
    let dragging = false;
    let pinch = null;
    let velocity = [0, 0];
    let lastMove = 0;

    svg.on("pointerdown", function(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      stopMotion();
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      velocity = [0, 0];
      pinch = pointers.size === 2 ? { distance: spread(), zoom: zoom } : null;
    });

    window.addEventListener("pointermove", function(event) {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const current = [event.clientX, event.clientY];
      if (pointers.size === 2 && pinch) {
        pointers.set(event.pointerId, current);
        zoomTo(pinch.zoom * spread() / pinch.distance);
        return;
      }
      const dx = current[0] - previous[0];
      const dy = current[1] - previous[1];
      // ignore the jitter of a click
      if (!dragging && Math.hypot(dx, dy) < 3) return;
      dragging = true;
      pointers.set(event.pointerId, current);

      // the point under the cursor follows it
      const perPixel = DEGREES / (radius * zoom);
      const turned = [dx * perPixel, -dy * perPixel];
      rotateBy(turned);
      const now = performance.now();
      const dt = Math.max(now - lastMove, 1);
      lastMove = now;
      velocity = [
        0.6 * velocity[0] + 0.4 * turned[0] / dt,
        0.6 * velocity[1] + 0.4 * turned[1] / dt
      ];
      moved();
    });

    function release(event) {
      if (!pointers.delete(event.pointerId)) return;
      pinch = null;
      if (pointers.size) return;
      const flicked = dragging && event.type === "pointerup" && !reducedMotion &&
        performance.now() - lastMove < 80 && Math.hypot(velocity[0], velocity[1]) > 0.02;
      dragging = false;
      if (flicked) glide(velocity);
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    function spread() {
      const points = Array.from(pointers.values());
      return Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) || 1;
    }

    // keep normal page scrolling: the wheel only zooms with ctrl/cmd (or a trackpad pinch)
    svg.on("wheel", function(event) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      stopMotion();
      zoomTo(zoom * Math.pow(2, -event.deltaY * 0.01));
    }, { passive: false });

    svg.on("dblclick", function(event) {
      event.preventDefault();
      fly({ rotation: rotation, zoom: zoom * 1.8 }, 350);
    });

    // touch screens have no "leave": tapping the sea closes the bubble
    svg.on("click", function(event) {
      if (!event.target.closest(".country, .country-dot, .place")) hideTooltip();
    });

    root.querySelectorAll("[data-zoom]").forEach(function(button) {
      button.addEventListener("click", function() {
        if (button.dataset.zoom === "in") fly({ rotation: rotation, zoom: zoom * 1.7 }, 300);
        else if (button.dataset.zoom === "out") fly({ rotation: rotation, zoom: zoom / 1.7 }, 300);
        else fly(home, 800);
      });
    });

    // --- around the globe ---

    const stat = root.querySelector(".travel-map-stat");
    stat.querySelector("strong").textContent = visited.length;
    stat.querySelector("span").textContent = visited.length === 1 ? "country / region" : "countries & regions";

    // one chip per visited country: hovering lights it up, clicking flies to it
    d3.select(root).select(".travel-map-list")
      .selectAll("li")
      .data(visited)
      .join("li")
      .append("button")
      .attr("type", "button")
      .text(function(c) { return c.label; })
      .on("pointerenter focus", function(event, country) { highlight(country, true); })
      .on("pointerleave blur", function(event, country) { highlight(country, false); })
      .on("click", function(event, country) {
        // the chips sit below the globe: bring it back into view if it has scrolled away
        canvas.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        fly({ rotation: facingRotation(country.centre), zoom: 26 / country.span }, 900);
      });

    // typos in _data/travel.yml are only worth showing while editing locally
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (unknown.size && local) {
      const warning = root.querySelector(".travel-map-warning");
      warning.textContent = "Unknown country name in _data/travel.yml: " + Array.from(unknown).join(", ");
      warning.hidden = false;
    }

    // --- start ---

    resize();
    new ResizeObserver(resize).observe(stage);
    if (!reducedMotion) {
      // spin into place
      rotation[0] -= 70;
      render(true);
      fly(home, 1600);
    }

    // --- helpers ---

    function describe(selection) {
      selection
        .on("pointerenter pointermove click", function(event, country) {
          if (dragging) return;
          showTooltip(event, country.label || country.name, country.label ? ["✓ Been here"] : [], "been");
        })
        .on("pointerleave", hideTooltip);
    }

    function highlight(country, on) {
      visitedLayer.selectAll(".visited, .country-dot")
        .filter(function(c) { return c === country; })
        .classed("active", on);
    }

    function gradient(id, attributes, stops) {
      const element = defs.append("radialGradient").attr("id", id);
      Object.keys(attributes).forEach(function(key) { element.attr(key, attributes[key]); });
      stops.forEach(function(stop) {
        element.append("stop").attr("offset", stop[0]).attr("class", stop[1]);
      });
    }

    function mainPiece(feature) {
      const geometry = feature.geometry;
      if (geometry.type !== "MultiPolygon") return feature;
      const pieces = geometry.coordinates.map(function(coordinates) {
        return { type: "Polygon", coordinates: coordinates };
      });
      return pieces[d3.maxIndex(pieces, function(piece) { return d3.geoArea(piece); })];
    }

    // rotation that brings a [longitude, latitude] to the middle of the globe
    function facingRotation(point) {
      return [-point[0], clamp(-point[1], -MAX_TILT, MAX_TILT)];
    }

    // the whole globe, turned to the middle of the visited places
    function homeView() {
      if (!visited.length) return { rotation: [-15, -20], zoom: 1 };
      const box = d3.geoBounds({ type: "MultiPoint", coordinates: visited.map(function(c) { return c.centre; }) });
      const east = box[1][0] < box[0][0] ? box[1][0] + 360 : box[1][0];
      const middle = [(box[0][0] + east) / 2, (box[0][1] + box[1][1]) / 2 * 0.8];
      return { rotation: facingRotation(middle), zoom: 1 };
    }
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function showTooltip(event, title, lines, lineClass) {
    tooltip.textContent = "";
    const heading = document.createElement("strong");
    heading.textContent = title;
    tooltip.appendChild(heading);
    lines.forEach(function(line) {
      if (line === undefined || line === null || line === "") return;
      const row = document.createElement("span");
      row.textContent = line;
      if (lineClass) row.className = lineClass;
      tooltip.appendChild(row);
    });
    const box = canvas.getBoundingClientRect();
    tooltip.hidden = false;
    // keep the bubble inside the map
    const half = tooltip.offsetWidth / 2 + 6;
    const x = Math.min(Math.max(event.clientX - box.left, half), box.width - half);
    const y = Math.max(event.clientY - box.top, tooltip.offsetHeight + 20);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }
})();
