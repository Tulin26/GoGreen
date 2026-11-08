

(function () {
  var gm = { polylines: [], markers: [], circles: [], routeCalls: [], mapCenter: null };
  gm.livePolylines = function () { return gm.polylines.filter(function (p) { return p.map; }).length; };
  gm.liveMarkers = function () { return gm.markers.filter(function (m) { return m.map; }); };
  gm.liveCircles = function () { return gm.circles.filter(function (c) { return c.map; }).length; };
  window.__gm = gm;

  function rad(d) { return (d * Math.PI) / 180; }
  function meters(a, b) {
    var k = Math.cos(rad(a.lat));
    return Math.hypot(rad(b.lng - a.lng) * k * 6371000, rad(b.lat - a.lat) * 6371000);
  }

  function MapClass(el, opts) {
    this.el = el;
    this.center = opts.center;
    this.zoom = opts.zoom;
    gm.mapCenter = this.center;
    el.setAttribute('data-fake-google-map', '1');
  }
  MapClass.prototype.setCenter = function (c) { this.center = c; gm.mapCenter = c; };
  MapClass.prototype.setZoom = function (z) { this.zoom = z; };
  MapClass.prototype.panTo = function (c) { this.center = c; gm.mapCenter = c; };
  MapClass.prototype.fitBounds = function () {};
  MapClass.prototype.getCenter = function () { var c = this.center; return { lat: function () { return c.lat; }, lng: function () { return c.lng; } }; };

  function Polyline(o) { this.path = o.path; this.map = o.map; this.opts = o; gm.polylines.push(this); }
  Polyline.prototype.setMap = function (m) { this.map = m; };
  function Circle(o) { this.center = o.center; this.radius = o.radius; this.map = o.map; gm.circles.push(this); }
  Circle.prototype.setMap = function (m) { this.map = m; };

  function Marker(o) { this.map = o.map; this.position = o.position; this.content = o.content; this.title = o.title; this.listeners = {}; gm.markers.push(this); }
  Marker.prototype.addEventListener = function (n, f) { this.listeners[n] = f; };

  function Bounds() { this.pts = []; }
  Bounds.prototype.extend = function (p) { this.pts.push(p); };

  var libs = {
    maps: { Map: MapClass, Polyline: Polyline, Circle: Circle },
    marker: { AdvancedMarkerElement: Marker },
    core: { LatLngBounds: Bounds, ColorScheme: { LIGHT: 'LIGHT', DARK: 'DARK', FOLLOW_SYSTEM: 'FOLLOW_SYSTEM' }, event: { trigger: function () {} } },
    places: {
      AutocompleteSessionToken: function () {},
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: function (req) { return Promise.resolve({ suggestions: window.__gmSuggest ? window.__gmSuggest(req) : [] }); } },

      Place: { searchByText: function () { return Promise.resolve({ places: [{ displayName: 'Bairro Teste', formattedAddress: 'Araçatuba - SP', location: { lat: function () { return -21.24; }, lng: function () { return -50.49; } } }] }); } },
    },
  };
  window.google = { maps: { importLibrary: function (n) { return Promise.resolve(libs[n]); } } };
  if (window.__gmapsPronto) window.__gmapsPronto();
})();
