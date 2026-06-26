if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Auth State Management
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // Protect Dashboard
    if (path.includes('dashboard.html') && !token) {
        window.location.href = 'login.html';
        return;
    }

    // Update Navbar UI if logged in
    if (token) {
        const authLinks = document.querySelectorAll('a[href="login.html"], a[href="register.html"]');
        authLinks.forEach(link => {
            link.innerText = 'Dashboard';
            link.href = 'dashboard.html';
        });
    }

    // Handle Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (currentTheme === 'light') {
            document.documentElement.classList.add('light-theme');
            themeToggleBtn.innerHTML = '☀️';
        }
        
        themeToggleBtn.addEventListener('click', () => {
            const root = document.documentElement;
            root.classList.toggle('light-theme');
            const isLight = root.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            themeToggleBtn.innerHTML = isLight ? '☀️' : '🌙';
        });
    }

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            const isActive = navLinks.classList.toggle('active');
            mobileToggle.setAttribute('aria-expanded', isActive);
            
            // Toggle icon between hamburger (☰) and close (✕)
            if (isActive) {
                mobileToggle.innerHTML = '✕';
            } else {
                mobileToggle.innerHTML = '☰';
            }
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mobile Filters Toggle
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const filtersSidebar = document.getElementById('filters-sidebar');
    if (toggleFiltersBtn && filtersSidebar) {
        toggleFiltersBtn.addEventListener('click', () => {
            if (filtersSidebar.style.display === 'none' || filtersSidebar.style.display === '') {
                filtersSidebar.style.display = 'block';
                toggleFiltersBtn.innerText = 'Hide Filters';
            } else {
                filtersSidebar.style.display = 'none';
                toggleFiltersBtn.innerText = 'Show Filters';
            }
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                filtersSidebar.style.display = 'block';
            } else {
                filtersSidebar.style.display = 'none';
                if(toggleFiltersBtn.innerText === 'Hide Filters') {
                    filtersSidebar.style.display = 'block';
                }
            }
        });
        
        if (window.innerWidth <= 768) {
            filtersSidebar.style.display = 'none';
        }
    }

    // Load data and trigger initialization
    await loadAllData();

    if (document.getElementById('search-input')) {
        initSearchPage();
    }
    if (document.getElementById('ai-build-form')) {
        initBuildPage();
    }
    
    // Add Animate on scroll logic
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });
});

// -- ACTIVE BUILD LOGIC -- //
let currentActiveBuild = {};

window.updateActiveBuildUI = function() {
    const categories = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'Power Supply', 'Case', 'CPU Cooler'];
    let count = 0;
    let total = 0;
    let wattage = 0;

    categories.forEach(cat => {
        const slotId = `slot-${cat}`;
        const slotEl = document.getElementById(slotId);
        if (!slotEl) return;

        if (currentActiveBuild[cat]) {
            const comp = currentActiveBuild[cat];
            count++;
            total += comp.parsedPrice;
            
            if (cat === 'CPU' && comp.tdp) wattage += parseInt(comp.tdp, 10);
            if (cat === 'GPU' && comp.tdp) wattage += parseInt(comp.tdp, 10);

            slotEl.className = 'build-slot filled';
            slotEl.innerHTML = `
                <div style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">
                    <small style="color: var(--primary); font-weight: 600; display: block; font-size: 0.7rem; text-transform: uppercase;">${cat}</small>
                    <span style="font-size: 0.85rem;">${comp.name}</span>
                </div>
                <button class="btn-remove-part" onclick="removeFromBuild('${cat}', event)">×</button>
            `;
            slotEl.onclick = null; 
        } else {
            slotEl.className = 'build-slot';
            slotEl.innerHTML = `+ Add ${cat}`;
            slotEl.onclick = () => filterByCategory(cat);
        }
    });

    const countEl = document.getElementById('active-parts-count');
    const wattageEl = document.getElementById('active-wattage');
    const totalEl = document.getElementById('active-total-price');

    if (countEl) countEl.innerText = `${count} / 8`;
    if (wattageEl) wattageEl.innerText = `${wattage} W`;
    if (totalEl) totalEl.innerText = total > 0 ? formatPriceNum(total) : '-';
};

window.addToBuild = function(componentId, category) {
    const compList = findComponentByType(category);
    const comp = compList.find(c => c.id === componentId || c.name === componentId);
    if (comp) {
        currentActiveBuild[category] = comp;
        updateActiveBuildUI();
    }
};

window.removeFromBuild = function(category, event) {
    if (event) event.stopPropagation();
    delete currentActiveBuild[category];
    updateActiveBuildUI();
};

window.clearActiveBuild = function() {
    currentActiveBuild = {};
    updateActiveBuildUI();
};

// -- DATA LOGIC -- //

function getAllComponents() {
    const d = window.forgePCData;
    if (!d || !d.cpus) return [];
    return [
        ...d.cpus, ...d.gpus, ...d.motherboards, ...d.rams, ...d.storages, ...d.cases, ...d.psus, ...d.coolers
    ];
}

function findComponentByType(type) {
    const map = {
        'CPU': window.forgePCData.cpus,
        'GPU': window.forgePCData.gpus,
        'Motherboard': window.forgePCData.motherboards,
        'RAM': window.forgePCData.rams,
        'Storage': window.forgePCData.storages,
        'Case': window.forgePCData.cases,
        'Power Supply': window.forgePCData.psus,
        'CPU Cooler': window.forgePCData.coolers
    };
    return map[type] || [];
}

function getTierClass(tier) {
    if (!tier) return 'entry';
    const t = tier.toLowerCase();
    if (t.includes('budget') || t.includes('entry')) return 'entry';
    if (t.includes('mid')) return 'mid';
    if (t.includes('high')) return 'high';
    if (t.includes('premium') || t.includes('enthusiast')) return 'premium';
    return 'entry';
}

function searchComponents(query, filters) {
    return getAllComponents().filter(c => {
        // Text query match (name, brand, or category)
        if (query) {
            const q = query.toLowerCase();
            const matchName = c.name && c.name.toLowerCase().includes(q);
            const matchBrand = c.brand && c.brand.toLowerCase().includes(q);
            const matchCat = c.category && c.category.toLowerCase().includes(q);
            if (!matchName && !matchBrand && !matchCat) return false;
        }
        
        // Category filter
        if (filters.categories && filters.categories.length > 0) {
            if (!filters.categories.includes(c.category)) return false;
        }

        // Tier filter (fuzzy match)
        if (filters.tiers && filters.tiers.length > 0) {
            const t = c.tier ? c.tier.toLowerCase() : 'budget';
            let match = false;
            for (let filterTier of filters.tiers) {
                if (t.includes(filterTier.toLowerCase())) {
                    match = true; break;
                }
            }
            if (!match) return false;
        }

        // Brand filter
        if (filters.brands && filters.brands.length > 0) {
            const b = c.brand ? c.brand.toLowerCase() : '';
            const match = filters.brands.some(fb => b.includes(fb.toLowerCase()));
            if (!match) return false;
        }

        // Price range
        if (filters.maxPrice) {
            if (c.parsedPrice > 0 && c.parsedPrice > filters.maxPrice) return false;
        }
        
        return true;
    });
}

function sortComponents(components, sortOption) {
    const copy = [...components];
    if (sortOption === 'Price: Low to High') {
        copy.sort((a, b) => a.parsedPrice - b.parsedPrice);
    } else if (sortOption === 'Price: High to Low') {
        copy.sort((a, b) => b.parsedPrice - a.parsedPrice);
    } else if (sortOption === 'Name: A to Z') {
        copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return copy;
}

function renderComponentCards(components, containerId, showAddButton = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    if (components.length === 0) {
        container.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1; padding: 2rem;">No components found matching your criteria.</p>';
        return;
    }

    components.forEach((c, index) => {
        const tierBadge = c.tier ? `<span class="badge badge-${getTierClass(c.tier)}">${c.tier}</span>` : '';
        const specsHtml = c.keySpecs ? c.keySpecs.split(' | ').filter(Boolean).join('<br>') : '';
        const delay = index * 0.05; 
        
        const card = document.createElement('div');
        card.className = 'card component-card glow-card animate-reveal';
        card.style.animationDelay = `${delay}s`;
        
        const safeName = (c.id || c.name).replace(/'/g, "\\'");
        
        card.innerHTML = `
            <div class="card-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <h3 class="component-title">${c.name || 'Unknown'}</h3>
                    ${tierBadge}
                </div>
                <div style="margin-bottom: 0.5rem;">
                    <small class="text-muted" style="color: var(--primary); font-weight: 600;">${c.category} ${c.brand ? '• ' + c.brand : ''}</small>
                </div>
                <p class="component-specs mono text-muted">${specsHtml}</p>
            </div>
            <div class="component-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="component-price">${c.formattedPrice}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="showComponentDetails('${safeName}', '${c.category}')">Details</button>
                    ${showAddButton ? `<button class="btn btn-primary" style="padding: 0.5rem 1rem;" onclick="addToBuild('${safeName}', '${c.category}')">Add</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function initSearchPage() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const browseContainer = document.getElementById('browse-category-container');
    const resultsContainer = document.getElementById('search-results-container');
    const resultCount = document.getElementById('result-count');
    const maxPriceInput = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-display');
    const sortSelect = document.getElementById('sort-select');
    const categoryPills = document.querySelectorAll('.category-pill');
    const brandsContainer = document.getElementById('brands-filter-container');
    
    const btnGridView = document.getElementById('btn-grid-view');
    const btnListView = document.getElementById('btn-list-view');
    const componentGrid = document.getElementById('component-grid');
    
    if (btnGridView && btnListView && componentGrid) {
        btnGridView.addEventListener('click', () => {
            componentGrid.classList.remove('list-view');
            btnGridView.classList.remove('btn-outline');
            btnGridView.classList.add('btn-primary');
            btnListView.classList.remove('btn-primary');
            btnListView.classList.add('btn-outline');
        });
        
        btnListView.addEventListener('click', () => {
            componentGrid.classList.add('list-view');
            btnListView.classList.remove('btn-outline');
            btnListView.classList.add('btn-primary');
            btnGridView.classList.remove('btn-primary');
            btnGridView.classList.add('btn-outline');
        });
    }
    
    // Data is loaded in DOMContentLoaded hook now
    
    let activeCategory = 'ALL';

    const getFilters = () => {
        const checkedTiers = Array.from(document.querySelectorAll('input[data-filter="tier"]:checked')).map(el => el.value);
        const checkedBrands = Array.from(document.querySelectorAll('input[data-filter="brand"]:checked')).map(el => el.value);
        
        return {
            categories: activeCategory !== 'ALL' ? [activeCategory] : [],
            tiers: checkedTiers,
            brands: checkedBrands,
            maxPrice: parseInt(maxPriceInput.value, 10)
        };
    };

    const generateBrandsFilter = (components) => {
        if (!brandsContainer) return;
        
        if (activeCategory === 'ALL' && !searchInput.value) {
            brandsContainer.innerHTML = '<p class="text-muted small">Select a category to filter brands.</p>';
            return;
        }

        const brands = new Set();
        components.forEach(c => {
            if (c.brand) brands.add(c.brand);
        });

        if (brands.size === 0) {
            brandsContainer.innerHTML = '<p class="text-muted small">No brands available.</p>';
            return;
        }

        const currentlyChecked = Array.from(brandsContainer.querySelectorAll('input:checked')).map(el => el.value);

        let html = '';
        Array.from(brands).sort().forEach(brand => {
            const isChecked = currentlyChecked.includes(brand) ? 'checked' : '';
            html += `<label class="checkbox-label"><input type="checkbox" data-filter="brand" value="${brand}" ${isChecked}> ${brand}</label>`;
        });
        brandsContainer.innerHTML = html;

        brandsContainer.querySelectorAll('input').forEach(cb => {
            cb.addEventListener('change', () => updateUI(null, true));
        });
    };

    const updateUI = (e, preserveBrands = false) => {
        const query = searchInput.value;
        const filters = getFilters();
        
        if (!query && activeCategory === 'ALL') {
            browseContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
            if (!preserveBrands) generateBrandsFilter([]);
            return;
        }

        browseContainer.style.display = 'none';
        resultsContainer.style.display = 'block';

        const baseFilters = { ...filters, brands: [] };
        const baseResults = searchComponents(query, baseFilters);
        if (!preserveBrands) generateBrandsFilter(baseResults);

        let results = searchComponents(query, getFilters());
        results = sortComponents(results, sortSelect.value);
        
        renderComponentCards(results, 'component-grid', true);
        resultCount.innerHTML = `Showing <strong>${results.length}</strong> components`;
    };

    window.filterByCategory = function(cat) {
        activeCategory = cat;
        categoryPills.forEach(p => {
            if (p.getAttribute('data-pill-cat') === cat) p.classList.add('active');
            else p.classList.remove('active');
        });
        updateUI();
        document.getElementById('search-input').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Category Pills Event Listeners
    categoryPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-pill-cat');
            updateUI();
        });
    });

    // Event listeners
    searchInput.addEventListener('input', () => updateUI());
    sortSelect.addEventListener('change', () => updateUI(null, true));
    maxPriceInput.addEventListener('input', (e) => {
        priceDisplay.innerText = `₹0 - ₹${parseInt(e.target.value, 10).toLocaleString('en-IN')}`;
        updateUI(null, true);
    });
    
    // URL params
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
        searchInput.value = queryParam;
    }
    
    updateUI();
    if (typeof updateActiveBuildUI === 'function') updateActiveBuildUI();
}

// -- BUILD WITH AI LOGIC -- //

/**
 * Real Recommendation Engine Adapter
 * Now fully integrated with build-engine.js
 */
async function generateRealBuild(useCase, minBudget, maxBudget) {
    try {
        const buildResult = window.generateAdvancedBuild(useCase, minBudget, maxBudget);
        // Save globally so explain-engine can access the exact context
        window.lastGeneratedBuild = buildResult;
        return buildResult;
    } catch (err) {
        console.error("Build Engine Error:", err);
        return {
            components: {},
            total: 0,
            warnings: ["Failed to generate build due to an internal error: " + err.message]
        };
    }
}

/**
 * Integrated Gemini-based explanations via explain-engine.js.
 */
window.showWhyExplanation = async function(btnElement, componentName, componentCategory) {
    const cardContent = btnElement.closest('.build-card-content');
    if (!cardContent) return;
    
    const explanationDiv = cardContent.querySelector('.gemini-explanation');
    const textEl = explanationDiv.querySelector('.explanation-text');
    
    if (explanationDiv.classList.contains('active')) {
        explanationDiv.classList.remove('active');
        btnElement.innerText = 'Why this part?';
        return;
    }
    
    explanationDiv.classList.add('active');
    btnElement.innerText = 'Close Explanation';
    textEl.innerHTML = '<span class="text-muted" style="font-style: normal;">✨ Connecting to AI to analyze specifications...</span>';

    if (!window.lastGeneratedBuild || !window.getAIExplanation) {
        textEl.innerHTML = 'AI Engine not fully loaded or no build context found.';
        return;
    }

    try {
        const explanation = await window.getAIExplanation(window.lastGeneratedBuild, componentCategory);
        textEl.innerHTML = '';
        let i = 0;
        let isTag = false;
        let text = explanation;
        function typeWriter() {
            if (i < text.length) {
                let char = text.charAt(i);
                if (char === '<') isTag = true;
                if (char === '>') isTag = false;
                textEl.innerHTML = text.substring(0, i + 1);
                i++;
                let delay = isTag ? 0 : 15;
                setTimeout(typeWriter, delay);
            }
        }
        typeWriter();
    } catch (err) {
        textEl.innerHTML = 'Failed to fetch AI explanation.';
    }
}

function initBuildPage() {
    const buildForm = document.getElementById('ai-build-form');
    if (!buildForm) return;

    const useCaseInput = document.getElementById('build-use-case');
    const budgetInputMin = document.getElementById('build-budget-min');
    const budgetInputMax = document.getElementById('build-budget-max');
    const budgetSliderMin = document.getElementById('budget-slider-min');
    const budgetSliderMax = document.getElementById('budget-slider-max');
    const budgetSliderVal = document.getElementById('budget-slider-val');
    const sliderFill = document.getElementById('slider-fill');
    
    // Custom Form Controls Logic
    const useCaseCards = document.querySelectorAll('.use-case-card');
    useCaseCards.forEach(card => {
        card.addEventListener('click', () => {
            useCaseCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            useCaseInput.value = card.dataset.value;
        });
    });

    function updateDualSlider() {
        if (!budgetSliderMin || !budgetSliderMax) return;
        let minVal = parseInt(budgetSliderMin.value, 10);
        let maxVal = parseInt(budgetSliderMax.value, 10);

        if (minVal >= maxVal) {
            let tmp = minVal;
            minVal = maxVal;
            maxVal = tmp;
        }

        budgetInputMin.value = minVal;
        budgetInputMax.value = maxVal;
        budgetSliderVal.innerText = formatPriceNum(minVal) + ' - ' + formatPriceNum(maxVal);

        const minPercent = ((minVal - 20000) / 280000) * 100;
        const maxPercent = ((maxVal - 20000) / 280000) * 100;
        if(sliderFill) {
            sliderFill.style.left = minPercent + '%';
            sliderFill.style.width = (maxPercent - minPercent) + '%';
        }
    }

    if (budgetSliderMin && budgetSliderMax) {
        budgetSliderMin.addEventListener('input', () => {
            let minVal = parseInt(budgetSliderMin.value, 10);
            let maxVal = parseInt(budgetSliderMax.value, 10);
            if(minVal >= maxVal) budgetSliderMin.value = maxVal - 1000;
            updateDualSlider();
        });
        budgetSliderMax.addEventListener('input', () => {
            let minVal = parseInt(budgetSliderMin.value, 10);
            let maxVal = parseInt(budgetSliderMax.value, 10);
            if(maxVal <= minVal) budgetSliderMax.value = minVal + 1000;
            updateDualSlider();
        });
        
        budgetInputMin.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10) || 20000;
            budgetSliderMin.value = val;
            updateDualSlider();
        });
        budgetInputMax.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10) || 300000;
            budgetSliderMax.value = val;
            updateDualSlider();
        });
        
        updateDualSlider();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const useCaseParam = urlParams.get('usecase');
    if (useCaseParam) {
        useCaseInput.value = useCaseParam;
        const matchingCard = document.querySelector(`.use-case-card[data-value="${useCaseParam}"]`);
        if (matchingCard) matchingCard.classList.add('active');
    }

    const emptyState = document.getElementById('build-empty-state');
    const loadingState = document.getElementById('build-loading-state');
    const resultsContainer = document.getElementById('build-results-container');
    const totalArea = document.getElementById('build-total-area');
    const totalPriceEl = document.getElementById('build-total-price');
    const clearBtn = document.getElementById('clear-build-btn');
    const warningsEl = document.getElementById('build-warnings');

    // Local Storage Persistence Banner
    const savedBuildData = localStorage.getItem('savedForgeBuild');
    if (savedBuildData && emptyState) {
        const bannerHtml = `
            <div id="resume-build-banner" style="width: 100%; padding: 1rem; background: rgba(255,138,61,0.1); border: 1px solid var(--primary); border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; animation: fadeInUp 0.5s ease;">
                <div>
                    <strong style="color: var(--primary);">Resume Forging</strong>
                    <div style="font-size: 0.85rem; color: var(--text-muted-light);">You have a saved build from your last session.</div>
                </div>
                <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" id="resume-build-btn">Load It</button>
            </div>
        `;
        emptyState.insertAdjacentHTML('beforebegin', bannerHtml);
        document.getElementById('resume-build-btn').addEventListener('click', () => {
            document.getElementById('resume-build-banner').style.display = 'none';
            try {
                const buildResult = JSON.parse(savedBuildData);
                window.lastGeneratedBuild = buildResult;
                renderBuildResults(buildResult);
            } catch (e) {
                console.error("Failed to load saved build", e);
            }
        });
    }

    function renderBuildResults(buildResult) {
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        resultsContainer.innerHTML = '';
        totalArea.style.display = 'none';
        
        if (buildResult.warnings && buildResult.warnings.length > 0) {
            warningsEl.innerHTML = buildResult.warnings.map(w => `<div style="color: var(--primary); margin-bottom: 0.25rem;">⚠ ${w}</div>`).join('');
        }

        let delay = 0;
        const order = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'Power Supply', 'Case', 'CPU Cooler'];
        
        order.forEach(cat => {
            const comp = buildResult.components[cat];
            if (!comp) return;

            const tierBadge = comp.tier ? `<span class="badge badge-${getTierClass(comp.tier)}">${comp.tier}</span>` : '';
            const specsHtml = comp.keySpecs ? comp.keySpecs.split(' | ').filter(Boolean).join(' • ') : 'N/A';

            const cardHtml = `
                <div class="card glow-card animate-reveal build-card" style="animation-delay: ${delay}s">
                    <div class="build-card-content" style="display: flex; flex-direction: column; width: 100%; gap: 1rem;">
                        <div class="build-card-header">
                            <div class="build-info" style="flex-grow: 1;">
                                <div style="margin-bottom: 0.25rem;">
                                    <small style="color: var(--primary); font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">${cat}</small>
                                </div>
                                <h3 class="component-title" style="margin-bottom: 0.25rem; font-size: 1.1rem;">${comp.name}</h3>
                                <p class="component-specs mono text-muted" style="margin-bottom: 0.5rem; font-size: 0.8rem;">${specsHtml}</p>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    ${tierBadge}
                                    <span class="mono" style="font-weight: 600; color: var(--text-primary); font-size: 1.1rem;">${comp.formattedPrice}</span>
                                </div>
                            </div>
                            <div class="build-actions" style="flex-shrink: 0;">
                                <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="showWhyExplanation(this, '${comp.name.replace(/'/g, "\\'")}', '${cat}')">Why this part?</button>
                            </div>
                        </div>
                        <div class="gemini-explanation">
                            <div class="gemini-eyebrow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>
                                Gemini Explanation
                            </div>
                            <p class="explanation-text"></p>
                        </div>
                    </div>
                </div>
            `;
            
            resultsContainer.insertAdjacentHTML('beforeend', cardHtml);
            delay += 0.1;
        });

        // Budget Allocation Bar Logic
        let barHtml = '<div class="allocation-bar-container">';
        let legendHtml = '<div class="allocation-legend">';
        order.forEach(cat => {
            const comp = buildResult.components[cat];
            if (comp && buildResult.total > 0) {
                const percent = (comp.parsedPrice / buildResult.total) * 100;
                let cssClass = '';
                if (cat === 'CPU') cssClass = 'cpu';
                else if (cat === 'GPU') cssClass = 'gpu';
                else if (cat === 'Motherboard') cssClass = 'motherboard';
                else if (cat === 'RAM') cssClass = 'ram';
                else if (cat === 'Storage') cssClass = 'storage';
                else if (cat === 'Power Supply') cssClass = 'psu';
                else if (cat === 'Case') cssClass = 'case';
                else if (cat === 'CPU Cooler') cssClass = 'cooler';
                
                barHtml += `<div class="allocation-segment ${cssClass}" style="width: ${percent}%;" title="${cat}: ${comp.formattedPrice}"></div>`;
                legendHtml += `<div class="legend-item"><div class="legend-color allocation-segment ${cssClass}" style="width: 8px; height: 8px; flex-shrink: 0;"></div><span>${cat} (${percent.toFixed(0)}%)</span></div>`;
            }
        });
        barHtml += '</div>';
        legendHtml += '</div>';

        document.getElementById('build-total-price').innerHTML = formatPriceNum(buildResult.total) + barHtml + legendHtml;
        
        resultsContainer.style.display = 'flex';
        totalArea.style.display = 'flex';
    }

    // Data loaded in DOMContentLoaded hook

    buildForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if(!useCaseInput.value) {
            alert('Please select a use-case first.');
            return;
        }
        
        emptyState.style.display = 'none';
        resultsContainer.style.display = 'none';
        totalArea.style.display = 'none';
        loadingState.style.display = 'flex';
        warningsEl.innerText = '';

        setTimeout(async () => {
            const useCase = useCaseInput.value;
            const minBudget = parseInt(budgetInputMin.value, 10);
            const maxBudget = parseInt(budgetInputMax.value, 10);
            
            const buildResult = await generateRealBuild(useCase, minBudget, maxBudget);
            localStorage.setItem('savedForgeBuild', JSON.stringify(buildResult));
            
            renderBuildResults(buildResult);

        }, 1500);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            buildForm.reset();
            useCaseCards.forEach(c => c.classList.remove('active'));
            useCaseInput.value = '';
            if (budgetSlider && budgetSliderVal) {
                budgetSlider.value = 80000;
                budgetSliderVal.innerText = '₹80,000';
            }
            resultsContainer.style.display = 'none';
            totalArea.style.display = 'none';
            warningsEl.innerText = '';
            emptyState.style.display = 'flex';
        });
    }
}

window.showComponentDetails = function(safeName, category) {
    let modal = document.getElementById('component-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'component-details-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 650px; width: 95%; max-height: 90vh; overflow-y: auto; background: var(--bg-card); padding: 2.5rem; border-radius: 12px; border: 1px solid var(--border-color); position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <button class="btn btn-outline" style="position: absolute; top: 1rem; right: 1rem; padding: 0.3rem 0.8rem; border-radius: 50%;" onclick="document.getElementById('component-details-modal').style.display = 'none'">✕</button>
                <div id="component-details-body"></div>
            </div>
        `;
        const style = document.createElement('style');
        style.innerHTML = `
            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); display: none; justify-content: center; 
                align-items: center; z-index: 9999; padding: 1rem;
                backdrop-filter: blur(5px);
            }
            #component-details-body .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }
            #component-details-body .full-width {
                grid-column: 1 / -1;
            }
            #component-details-body strong {
                color: var(--primary);
                display: block;
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 0.3rem;
            }
            #component-details-body ul {
                margin-top: 0.5rem;
                margin-left: 1.2rem;
            }
            #component-details-body li {
                margin-bottom: 0.3rem;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if(e.target === modal) modal.style.display = 'none';
        });
    }

    let comp = null;
    const allComps = window.getAllComponents ? window.getAllComponents() : [];
    comp = allComps.find(c => {
         const cSafeName = (c.name || '').replace(/[^a-zA-Z0-9]/g, '-');
         return cSafeName === safeName || c.slug === safeName || c.id === safeName;
    });

    if (!comp) {
        alert("Component details could not be loaded.");
        return;
    }

    let detailsHtml = `<h2 style="margin-bottom: 0.2rem; font-size: 1.8rem; color: #fff;">${comp.name}</h2>`;
    detailsHtml += `<div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">${comp.category || category}</div>`;
    if (comp.formattedPrice) {
        detailsHtml += `<div style="font-size: 1.4rem; color: var(--primary); font-weight: bold; margin-bottom: 1.5rem;">${comp.formattedPrice}</div>`;
    }
    
    detailsHtml += `<hr style="border-color: var(--border-color); opacity: 0.5; margin-bottom: 1.5rem;">`;
    detailsHtml += `<div class="detail-grid">`;
    
    const ignoredKeys = ['name', 'category', 'id', 'slug', 'parsedPrice', 'formattedPrice', 'priceMin', 'priceMax', 'price', 'keySpecs', 'score1080p', 'score1440p', 'score4k'];
    
    for (const [key, value] of Object.entries(comp)) {
        if (ignoredKeys.includes(key)) continue;
        if (value === null || value === undefined || value === '') continue;
        
        const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        if (Array.isArray(value)) {
            detailsHtml += `<div class="full-width"><strong>${displayKey}:</strong><ul>`;
            value.forEach(v => {
                detailsHtml += `<li>${v}</li>`;
            });
            detailsHtml += `</ul></div>`;
        } else if (typeof value === 'object') {
            detailsHtml += `<div class="full-width"><strong>${displayKey}:</strong><pre style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 6px; margin-top:0.5rem; overflow-x: auto; font-size: 0.85rem;">${JSON.stringify(value, null, 2)}</pre></div>`;
        } else {
            if (typeof value === 'string' && value.length > 100) {
                detailsHtml += `<div class="full-width"><strong>${displayKey}:</strong><p style="line-height: 1.6; color: #e2e8f0;">${value}</p></div>`;
            } else {
                detailsHtml += `<div><strong>${displayKey}:</strong> <span style="font-size: 1.05rem; font-weight: 500; color: #f8fafc;">${value}</span></div>`;
            }
        }
    }
    detailsHtml += `</div>`;

    document.getElementById('component-details-body').innerHTML = detailsHtml;
    modal.style.display = 'flex';
};

// --- GLOBAL UTILITIES & API INTEGRATION ---

window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.apiFetch = async function(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`http://localhost:5000${endpoint}`, {
            ...options,
            headers
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }
        
        return data;
    } catch (err) {
        window.showToast(err.message, 'error');
        throw err;
    }
};

// --- AUTHENTICATION FORMS ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Password match check
            const pwd = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;
            if (pwd !== confirm) {
                document.getElementById('password-error').style.display = 'block';
                return;
            }

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;

            try {
                const data = await window.apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, email, password: pwd })
                });
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.showToast('Account created! Welcome to ForgePC.', 'success');
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
            } catch (err) {
                // Handled in apiFetch (toast is shown)
            }
        });
    }

    // 2. Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const data = await window.apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.showToast('Logged in successfully!', 'success');
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
            } catch (err) {
                // Handled in apiFetch (toast is shown)
            }
        });
    }

    // --- HOME PAGE REDESIGN ANIMATIONS ---
    const counters = document.querySelectorAll('.count-up');
    if (counters.length > 0) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetEl = entry.target;
                    const targetNum = parseInt(targetEl.getAttribute('data-target'), 10);
                    const suffix = targetEl.getAttribute('data-suffix') || '';
                    
                    let start = 0;
                    const duration = 2000; // 2 seconds
                    const stepTime = Math.abs(Math.floor(duration / targetNum));
                    
                    // Cap the step time so high numbers animate smoothly in 2s
                    const increment = targetNum > 500 ? Math.ceil(targetNum / 60) : 1; 

                    const timer = setInterval(() => {
                        start += increment;
                        if (start >= targetNum) {
                            start = targetNum;
                            clearInterval(timer);
                            // Format with commas if large
                            const formatted = start >= 1000 ? (start/1000) + 'K' : start;
                            targetEl.innerText = formatted + suffix;
                        } else {
                            targetEl.innerText = start + suffix;
                        }
                    }, targetNum > 500 ? 1000/60 : stepTime);
                    
                    obs.unobserve(targetEl);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    // --- EXTREME DYNAMIC JS ---

    // 1. Custom Glowing Cursor
    let cursorDot = document.querySelector('.cursor-dot');
    let cursorGlow = document.querySelector('.cursor-glow');
    
    // Auto-inject cursor elements if they are missing (for pages other than index.html)
    if (!cursorDot || !cursorGlow) {
        cursorGlow = document.createElement('div');
        cursorGlow.className = 'cursor-glow';
        cursorDot = document.createElement('div');
        cursorDot.className = 'cursor-dot';
        document.body.appendChild(cursorGlow);
        document.body.appendChild(cursorDot);
    }

    if (cursorDot && cursorGlow) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            
            // Set directly, CSS transition handles the trailing delay smoothly without lagging the browser
            cursorGlow.style.left = `${posX}px`;
            cursorGlow.style.top = `${posY}px`;
        });

        // Add hover aggressive state
        document.querySelectorAll('a, button, input, .card, .build-slot, .use-case-interactive').forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });
    }

    // 2. Neon Particles Initialization
    if (document.getElementById('particles-js') && window.particlesJS) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#FF8A3D" },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.5, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#FF8A3D",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 3,
                    "direction": "none",
                    "random": true,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "grab" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "grab": { "distance": 200, "line_linked": { "opacity": 1 } },
                    "push": { "particles_nb": 4 }
                }
            },
            "retina_detect": true
        });
    }

    // 3. Aggressive Scroll Reveal
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

        revealElements.forEach(el => revealObserver.observe(el));
    }
});
