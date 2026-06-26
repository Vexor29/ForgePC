window.forgePCData = {
    cpus: [], gpus: [], motherboards: [], rams: [], psus: [],
    storages: [], cases: [], coolers: [], taxonomy: {}
};

async function loadAllData() {
    const dataSources = [
        { key: 'cpus', file: 'cpu.json', type: 'CPU' },
        { key: 'gpus', file: 'gpu.json', type: 'GPU' },
        { key: 'motherboards', file: 'motherboard.json', type: 'Motherboard' },
        { key: 'rams', file: 'ram.json', type: 'RAM' },
        { key: 'storages', file: 'storage.json', type: 'Storage' },
        { key: 'cases', file: 'case.json', type: 'Case' },
        { key: 'psus', file: 'psu.json', type: 'Power Supply' },
        { key: 'coolers', file: 'cpu-cooler.json', type: 'CPU Cooler' },
        { key: 'taxonomy', file: 'use-case-taxonomy.json', type: 'Use Case' }
    ];

    updateDebugStatus("Data Status: Loading...");
    let totalLoaded = 0;

    for (const source of dataSources) {
        const pathsToTry = [
            `./data/${source.file}`,
            `../data/${source.file}`,
            `/data/${source.file}`
        ];

        let fetchedData = null;

        for (const path of pathsToTry) {
            console.log(`Trying to load: ${path}`);
            try {
                const res = await fetch(path);
                if (res.ok) {
                    fetchedData = await res.json();
                    console.log(`✅ Success loading: ${path}`);
                    break;
                } else {
                    console.warn(`❌ Failed loading: ${path} - Status: ${res.status}`);
                }
            } catch (err) {
                console.error(`❌ Error fetching: ${path}`, err);
            }
        }

        if (fetchedData) {
            let components = [];
            if (Array.isArray(fetchedData)) {
                components = fetchedData;
            } else if (fetchedData.cases) {
                components = fetchedData.cases;
            } else if (fetchedData.units) {
                components = fetchedData.units;
            } else if (fetchedData.types) {
                for (const k in fetchedData.types) {
                    if (fetchedData.types[k].kits) components.push(...fetchedData.types[k].kits);
                    else if (fetchedData.types[k].coolers) components.push(...fetchedData.types[k].coolers);
                }
            } else if (fetchedData.categories) {
                for (const k in fetchedData.categories) {
                    if (fetchedData.categories[k].drives) components.push(...fetchedData.categories[k].drives);
                }
            } else {
                components = [fetchedData]; 
            }

            if (source.key !== 'taxonomy') {
                components.forEach(c => {
                    c.category = source.type;
                    c.parsedPrice = parsePriceStr(c.price);
                    c.formattedPrice = formatPriceNum(c.parsedPrice);
                    c.keySpecs = extractKeySpecs(c, source.type);
                });
            }

            window.forgePCData[source.key] = components;
            totalLoaded += components.length;
        } else {
            console.error(`Could not load ${source.file} from any path.`);
        }
    }

    updateDebugStatus(`Loaded ${totalLoaded} components`);
    console.log("Data loaded structure:", window.forgePCData);
}

function updateDebugStatus(msg) {
    const debugEl = document.getElementById('data-debug-status');
    if (debugEl) {
        debugEl.innerText = msg;
    }
}

function parsePriceStr(str) {
    if (!str) return 0;
    const match = str.toString().match(/[\d,]+/);
    if (match) {
        return parseInt(match[0].replace(/,/g, ''), 10);
    }
    return 0;
}

function formatPriceNum(num) {
    if (!num) return 'TBA';
    return '₹' + num.toLocaleString('en-IN');
}

function extractKeySpecs(c, type) {
    switch (type) {
        case 'CPU': return `${c.cores || ''} | ${c.baseClock || ''} | ${c.tdp || ''}`;
        case 'GPU': return `${c.vram || ''} | ${c.architecture || ''} | ${c.tdp || ''}`;
        case 'Motherboard': return `${c.socket || ''} | ${c.formFactor || ''} | ${c.ramType || ''}`;
        case 'RAM': return `${c.capacity || ''} | ${c.speed || ''} | ${c.casLatency || ''}`;
        case 'Storage': return `${c.capacity || ''} | ${c.formFactor || ''} | ${c.readSpeed || ''}`;
        case 'Case': return `${c.formFactor || ''} | ${c.sidePanel || ''}`;
        case 'Power Supply': return `${c.wattage || ''} | ${c.efficiency || ''} | ${c.modular || ''}`;
        case 'CPU Cooler': return `${c.type || ''} | ${c.tdpRating || ''} | ${c.noiseLevel || ''}`;
        default: return '';
    }
}
