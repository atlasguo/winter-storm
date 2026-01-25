require([
    "esri/WebMap",
    "esri/views/MapView",
    "esri/widgets/Legend",
    "esri/widgets/Search",
    "esri/widgets/Zoom",
    "esri/widgets/Expand",
    "esri/geometry/Extent",
    "esri/geometry/SpatialReference"
], function (
    WebMap,
    MapView,
    Legend,
    Search,
    Zoom,
    Expand,
    Extent,
    SpatialReference
) {

    /* =====================================================
       Web map and view initialization
       ===================================================== */
    const webmap = new WebMap({
        portalItem: {
            id: "6cf23948d93b4b5c9920919c58a6105a"
        }
    });

    const view = new MapView({
        container: "viewDiv",
        map: webmap,
        ui: {
            components: ["attribution"]
        }
    });

    view.when(async () => {

        /* =====================================================
           View constraints (CONUS extent)
           ===================================================== */
        const conusExtent = new Extent({
            xmin: -13884991,
            ymin: 2870341,
            xmax: -7455066,
            ymax: 6338219,
            spatialReference: SpatialReference.WebMercator
        });

        view.constraints = {
            geometry: conusExtent,
            minZoom: 3,
            maxZoom: 10
        };

        view.goTo(conusExtent);

        /* =====================================================
           Layer lookup by title
           ===================================================== */
        const layerIndex = {
            layerA: webmap.layers.find(l => l.title === "Overall Impact (Day 1)"),
            layerB: webmap.layers.find(l => l.title === "Overall Impact (Day 2)"),
            layerC: webmap.layers.find(l => l.title === "Overall Impact (Day 3)"),
            layerD: webmap.layers.find(l => l.title === "Overall Impact (Days 1-3)")
        };

        /* =====================================================
           Time parsing utilities
           ===================================================== */
        function parseZulu(str) {
            const [z, d] = str.split(" ");
            const hour = parseInt(z.replace("Z", ""), 10);
            const [mm, dd, yy] = d.split("/").map(Number);
            return new Date(Date.UTC(2000 + yy, mm - 1, dd, hour));
        }

        function formatET(date) {
            return date.toLocaleString("en-US", {
                timeZone: "America/New_York",
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }).replace(",", "") + " ET";
        }

        async function fetchValidTime(layer) {
            const q = layer.createQuery();
            q.where = "1=1";
            q.outFields = ["valid_time"];
            q.num = 1;
            q.returnGeometry = false;

            const res = await layer.queryFeatures(q);
            const raw = res.features[0].attributes.valid_time;
            const [a, b] = raw.split("-").map(s => s.trim());

            return `${formatET(parseZulu(a))} – ${formatET(parseZulu(b))}`;
        }

        /* =====================================================
           Inject time labels into radio panel
           ===================================================== */
        for (const [key, layer] of Object.entries(layerIndex)) {
            const label = document.querySelector(
                `#controlPanel label[data-key="${key}"] .label-text`
            );

            const time = await fetchValidTime(layer);
            label.insertAdjacentHTML("beforeend", `<span class="time">${time}</span>`);
        }

        /* =====================================================
           Layer visibility control
           ===================================================== */
        Object.keys(layerIndex).forEach(key => {
            layerIndex[key].visible = (key === "layerA");
        });

        document.querySelectorAll("input[name='layerGroup']").forEach(radio => {
            radio.addEventListener("change", event => {
                const key = event.target.value;
                Object.values(layerIndex).forEach(layer => layer.visible = false);
                layerIndex[key].visible = true;
            });
        });

        /* =====================================================
           UI widgets
           ===================================================== */
        const radioExpand = new Expand({
            view,
            content: document.getElementById("controlPanel"),
            expanded: true,
            expandIconClass: "esri-icon-collection"
        });

        view.ui.add(radioExpand, "top-left");

        view.ui.add(
            new Expand({
                view,
                content: new Legend({ view }),
                expanded: true
            }),
            "bottom-right"
        );

        view.ui.add(new Search({ view }), { position: "top-right", index: 0 });
        view.ui.add(new Zoom({ view }), { position: "top-right", index: 1 });
    });
});
