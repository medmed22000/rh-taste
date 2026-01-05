document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE (Persistent) ---
    let total_order = []; // Stores all confirmed orders
    let currentSelection = null; // Only exists when customizing an item
    const body = document.body;
    let promoApplied = false;
    let promoDiscount = 0;
    
    // --- GLOBAL ELEMENTS (Always present) ---
    const overlay = document.getElementById('overlay');
    const basket = document.getElementById('basket');
    const basket_button = document.querySelector('.basket_icon');
    const basketdiv = basket ? basket.querySelector('div') : null;
    const homeButton = document.querySelectorAll('#nav_barr .home');
    
    // --- Price mappings (Global) ---
    const sup_04 = ["mayonnaise",  "zaatar", "algerienne", "pinky", "andalouse"];
    const sup_02 = ["ketchup"];
    const sup_12 = ["Rodeo 33cl"];
    const sup_18 = ["Rodeo 50cl" ,"Jus de banane"];
    const sup_20 = ["Jus d'orange", "fries"];

    // auto scroll 
    function autoScroll() {
        const carousel = document.getElementById('new_products');
        const productItems = carousel.querySelectorAll('li');

        // Check if there are any items
        if (productItems.length > 0) {
            // Get the width of a single item (this is '100%' of the container width)
            const itemWidth = productItems[0].offsetWidth;
            let scrollPosition = 0;

            // Set an interval for scrolling (e.g., every 3 seconds)
            const intervalTime = 2000;

            // Declare autoScroll variable outside so both events can access it
            let autoScroll = null;
            let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Function to start autoscroll
            function startAutoScroll() {
                if (!autoScroll) {
                    autoScroll = setInterval(() => {
                        scrollPosition += itemWidth;
                        if (scrollPosition > (carousel.scrollWidth - itemWidth)) {
                            scrollPosition = 0;
                        }
                        carousel.scroll({
                            left: scrollPosition,
                            behavior: 'smooth'
                        });
                    }, intervalTime);
                }
            }

            // Function to stop autoscroll
            function stopAutoScroll() {
                if (autoScroll) {
                    clearInterval(autoScroll);
                    autoScroll = null;
                }
            }

            startAutoScroll();

            // For mouse devices
            if (!isTouchDevice) {
                carousel.addEventListener('mouseenter', stopAutoScroll , { passive: true });
                carousel.addEventListener('mouseleave', startAutoScroll , { passive: true });
            } 
            // For touch devices
            else {
                carousel.addEventListener('touchstart', stopAutoScroll , { passive: true } );
                carousel.addEventListener('touchend', () => {
                    // Delay restart to give user time to interact
                    setTimeout(startAutoScroll, 1000); // Resume after 2 seconds
                } , { passive: true });
            }
        }
    }

    // order confirmation process 
    function restAll() {
        document.querySelector("#basket .order_details").innerHTML = '';
        document.querySelector("#basket .order_total_price").innerText = '0 €';
        document.querySelector("#nav_barr .number_of_items_in_basket p").innerText = '0';

        const inputs = document.querySelectorAll("#basket .client-info input") ;
        inputs.forEach( input => {
            input.value = '';
        });

        // Clear promo state
        clearPromoState();
    }

    function confirmOrder() {
        // 1. Validate Inputs
        const name = document.getElementById("client_name").value;
        const phone = document.getElementById("client_phone").value;
        const address = document.getElementById("client_address").value;
        const email_adress = document.getElementById("client_email").value;
        const methode_paiment = document.querySelector("input[name='paiment']:checked");

        if(!name ) {
            alert("Veuillez ajouter votre Nom svp !");
            return;
        }
        if(!phone  ) {
            alert("Veuillez ajouter votre numero de telephone svp !");
            return;
        }
        if( !address  ) {
            alert("Veuillez ajouter votre de livraison svp !");
            return;
        }
        if( !email_adress) {
            alert("Veuillez ajouter votre email-address svp !");
            return;
        }
        if( !methode_paiment ) {
            alert("Veuillez choisir une méthode de paiment svp !");
            return;
        }

        
        if(total_order.length === 0) {
            alert("Ton panier est vide !");
            return;
        }

        // 2. Format the Basket Data into a String
        let orderDetailsText = "";
        total_order.forEach((item, index) => {
            orderDetailsText += `${index + 1}. ${item.itemNme} (${item.meatCooking})\n`;
            if ( item.sauceChoisis.length > 2 ) {
                orderDetailsText += `      - Sauce choisis : ${item.sauceChoisis}\n`
            }
            // Add supplements if they exist
            orderDetailsText += `      - Supplements : \n`
            if ( Object.keys(item.supplements).length == 0 ) {
                { orderDetailsText += `               + None\n` }
            }
            else {
                for (const [key, val] of Object.entries(item.supplements)) {
                    if(val > 0) orderDetailsText += `               + ${key} x${val}\n`;
                }
            }

            // Add extras if they exist
            orderDetailsText += `      - Extras : \n`
            if ( Object.keys(item.extras).length == 0 ) {
                { orderDetailsText += `               + None\n` }
            }
            else {
                for (const [key, val] of Object.entries(item.extras)) {
                    if(val > 0) orderDetailsText += `               + ${key} x${val}\n`;
                }
            }
            
            orderDetailsText += `Price: ${item.total} €\n----------------\n`;
        });

        // Add promo info to order details
        if (promoApplied) {
            orderDetailsText += `\n--- PROMO APPLIQUÉE ---\n`;
            orderDetailsText += `Réduction: -€${promoDiscount.toFixed(2)}\n`;
        }

        const orderTime = new Date().toLocaleTimeString('fr-BE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 3. Prepare Data for EmailJS
        const templateParams = {
            from_name: name,
            phone_number: phone,
            email : email_adress ,
            address: address,
            paiment : methode_paiment.value,
            order_details: orderDetailsText,
            total_price: document.querySelector(".order_total_price").innerText,
            promo_applied: promoApplied ? 'Oui' : 'Non',
            promo_discount: promoApplied ? `€${promoDiscount.toFixed(2)}` : '€0.00',
            order_time : orderTime
        };

        let closed = false ;

        // Get current date/time
        const now = new Date();
        const hour = now.getHours();

        if ( hour >= 12 && hour < 23 ) {
            closed = false ;
        }
        else {
            closed = true ;
        }

        const pause = false ;
        if ( pause ) {
            const heure = "18h"
            alert(`🍽️ Pause temporaire \nNotre équipe prend une courte pause.Nous serons de retour à ${heure}.\non vous rappelle dès que nous serons à nouveau disponibles !`)
            emailjs.send('to_kitchen', 'template_5di9epe', templateParams)
        }
        else if ( closed ) {
            if ( hour >= 6 && hour < 24  ) {
                alert(`🌙 Nos fourneaux sont éteints ! \nLes commandes reprendront dès 12h00.`) 
            }
            else { alert(`🌙 Nos fourneaux sont éteints ! \nOn se repose pour mieux vous régaler demain. \nLes commandes reprendront dès 12h00. \nÀ demain pour votre prochain festin !`)
            }
        }
        else {
            // Show loading status
            const statusText = document.getElementById("order-status");
            statusText.style.display = "block";
            statusText.innerText = "Processing order...";

            // 4. Send the Email
            emailjs.send('to_kitchen', 'template_5di9epe', templateParams)
            emailjs.send('to_client', 'template_bjy3z56', templateParams)
                .then(function(response) {
                    // Success UI
                    alert("Commande bien confirmée, on te contactera bientot.");
                    
                    // Clear Basket and Inputs
                    total_order = [];
                    document.getElementById("client_name").value = "";
                    document.getElementById("client_phone").value = "";
                    document.getElementById("client_address").value = "";
                    document.getElementById("client_email").value = "";
                    statusText.style.display = "none";
                    
                    // Update UI
                    restAll();
                    closeBasket();
                    
                    // Reset basket UI
                    resetBasketUI();
                    
                }, function(error) {
                    alert("Failed to send order. Please call us directly.");
                    statusText.style.display = "none";
                });
        }
    }

    // --- UTILITY FUNCTIONS (Global) ---
    
    function getItemNameFromData(itemSelector) {
        const containerDiv = itemSelector.closest('[data-name]');
        return containerDiv ? containerDiv.dataset.name : null;
    }

    function getTacosSizePrice(name) {
        if (name == "S") return -1;
        if (name == "M") return 0;
        if (name == "L") return 1.5;
        if (name == "XL") return 3.5;
        return 0;
    }

    function getExtraPrice(name) {
        if (sup_04.includes(name)) return 0.4;
        if (sup_02.includes(name)) return 0.2;
        if (sup_12.includes(name)) return 1.2;
        if (sup_18.includes(name)) return 1.8;
        if (sup_20.includes(name)) return 2.0;
        return 0;
    }

    function determineCategory(name, contextElement) {
        const itemElement = contextElement ? contextElement.querySelector(`[data-name="${name}"]`) : null;
        if (itemElement && itemElement.closest('.supplements')) {
            return 'supplements';
        }
        return 'extras';
    }

    // --- BASKET MANAGEMENT (Always active) ---

    function updateBasketnums(commande_n) {
        const commandes = document.querySelectorAll(".commande")

        commandes.forEach( commande => {
            let num = commande.classList[1]
            num = parseFloat(num.replace(/[^\d.-]/g, ''));
            if ( num > commande_n ) {
                //commmande num
                commande.classList.replace(`c${num}`, `c${num-1}`)
                
                //trash num
                commande.querySelector(`.t${num}`).classList.replace(`t${num}`, `t${num-1}`)
                
                //details num
                if ( document.querySelector(`.d${num}`)) {
                    document.querySelector(`.d${num}`).classList.replace(`d${num}`, `d${num-1}`)
                }
                
                // title 
                let title = commande.querySelector("h2").innerHTML
                title = title.replace( title[0] , num-1)
                commande.querySelector("h2").innerHTML = title                
            }
        })

        let num_items = document.querySelector(".number_of_items_in_basket p").innerText
        document.querySelector(".number_of_items_in_basket p").innerText = num_items-1
    }

    function removeItems( trash_n ) {
        //trash_n : t1 , t2 , t3 ... ;
        const commande_n = parseFloat(trash_n.replace(/[^\d.-]/g, ''));
        const selection_num  = parseFloat(trash_n)-1 ;

        let total = document.querySelector('#basket .order_total_price').innerText
        total = parseFloat(total).toFixed(2) ;

        let selection_total = document.querySelector(`#basket .c${commande_n} .price`).innerText
        selection_total = parseFloat(selection_total).toFixed(2)

        total = total - selection_total
        total = total.toFixed(2)

        document.querySelector('#basket .order_total_price').innerText = total +" €"

        document.querySelector(`#basket .c${commande_n}`).setAttribute("class" , "x")
        if ( document.querySelector(`#basket .d${commande_n}`)) {
            document.querySelector(`#basket .d${commande_n}`).setAttribute("class" , "x")
        }

        total_order.splice(selection_num, 1) ;

        updateBasketnums(commande_n);

        // Recalculate promo if applied
        if (promoApplied) {
            recalculatePromo();
        }
    }
    
    function updateBasketDisplay(item) {
        document.querySelector('.number_of_items_in_basket p').innerText = total_order.length;

        let total = 0 ;
        total_order.forEach( item => {
            total+= item.total
        });
        total = parseFloat(total).toFixed(2);

        // Apply promo if active
        if (promoApplied) {
            // Calculate discount based on current total
            const discountPercentage = 0.10; // 10%
            promoDiscount = total * discountPercentage;
            total = total - promoDiscount;
            total = Math.max(0, total).toFixed(2);
            showDiscountInfo();
        }

        document.querySelector('#basket .order_total_price').innerText = total +" €";

        // --- Clear previous content ---
        let nextEl = basketdiv.nextElementSibling;
        while(nextEl) {
            let temp = nextEl.nextElementSibling;
            if (nextEl.classList.contains('choice') || nextEl.tagName === 'DETAILS') {
                nextEl.remove();
            }
            nextEl = temp;
        }
        
        // Render the current total_order array
        const index = total_order.length ;
            
        // Render Supplements (using the new supplements object)
        let suppsList = '';
        for (const [sup, count] of Object.entries(item.supplements)) {
            if (count > 0) {
                suppsList += `<li>${sup.charAt(0).toUpperCase() + sup.slice(1)} x ${count}</li>`;
            }
        }
        if (!suppsList) suppsList = '<li>N/A</li>';

        // Render Extras (using the extras object)
        let extrasList = '';
        for (const [ext, count] of Object.entries(item.extras)) {
            if (count > 0) {
                extrasList += `<li>${ext.charAt(0).toUpperCase() + ext.slice(1)} x ${count}</li>`;
            }
        }

        let type = '' ;
        // Type of item : burger , tacos , dessert ...
        if ( document.querySelector("#sections h1").className == "burgers") {
            type = `<p class='titre'>Cuisson de viande : </p> <p class='meat_cook_resume'>${item.meatCooking}</p>`
        }
        else if ( document.querySelector("#sections h1").className == "tacos") {
            type = `<p class='titre'>Taille du Tacos : </p> <p class='meat_cook_resume'>${item.meatCooking}</p>
                    <p class='titre'>Sauce choisis : </p> <p class='sauce'>${item.sauceChoisis}</p>`
        }

        // Insert new order items after the H1 title
        if ( item.meatCooking.length < 1 ) {
            basketdiv.innerHTML +=  `
                <div class="commande c${index}"><h2 class="choice">${index}: ${item.itemNme+item.itemCount}<span class="price">${item.total} €</span></h2><button class="trash t${index}"></button></div>`
        }
        else {
            basketdiv.innerHTML +=  `
                <div class="commande c${index}"><h2 class="choice">${index}: ${item.itemNme+item.itemCount}<span class="price">${item.total} €</span></h2><button class="trash t${index}"></button></div>
                <details class="order_details d${index}">
                    <summary>View Details</summary>
                    <div class="resume_ordre">
                        ${type}
                        <p class="titre">Supplements : </p> <ul>${suppsList}</ul>
                        <p class="titre">Extras : </p> <ul>${extrasList}</ul>
                    </div>
                </details>`;
        }

        const details_basket = document.querySelectorAll("details")
        if ( details_basket ) {
            details_basket.forEach(det => {
                det.addEventListener('toggle', () => {
                    if (det.open) {
                        details_basket.forEach(dett => {
                            if (dett !== det) dett.open = false;
                        });
                    }
                });
            });
        }

        // Setup trash listeners for new items
        setupTrashListeners();
    }

    function renderBasketItems() {
        basket.style.display = "grid";
        overlay.style.display = "block"; // Show Overlay
    }

    // --- PROMO CODE FUNCTIONS ---
    function clearPromoState() {
        promoApplied = false;
        promoDiscount = 0;
        
        // Remove discount info
        const discountInfo = document.querySelector('.discount-info');
        if (discountInfo) discountInfo.remove();
    }

    function showDiscountInfo() {
        // Remove existing info
        const existingInfo = document.querySelector('.discount-info');
        if (existingInfo) existingInfo.remove();
        
        const discountInfo = document.createElement('div');
        discountInfo.className = 'discount-info';
        discountInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; color: green; font-weight: bold;">
                <span>Remise:</span>
                <span>-€${promoDiscount.toFixed(2)}</span>
            </div>
        `;
        discountInfo.style.cssText = 'margin: 10px 0; padding: 10px; background: #f0fff4; border-radius: 5px;';
        
        const totalContainer = document.querySelector('.order_total_price').parentElement;
        totalContainer.parentNode.insertBefore(discountInfo, totalContainer);
    }

    function recalculatePromo() {
        if (!promoApplied) return;
        
        const totalElement = document.querySelector(".order_total_price");
        let totalText = totalElement.innerText;
        let total = parseFloat(totalText.replace('€', '').trim());
        
        // Calculate original total by adding back the discount
        const originalTotal = total + promoDiscount;
        
        // Recalculate discount (10% of original)
        const discountPercentage = 0.10;
        promoDiscount = originalTotal * discountPercentage;
        const discountedTotal = originalTotal - promoDiscount;
        
        totalElement.innerText = discountedTotal.toFixed(2) + " €";
        
        // Update discount info
        const discountInfo = document.querySelector('.discount-info');
        if (discountInfo) {
            discountInfo.innerHTML = `
                <div style="display: flex; justify-content: space-between; color: green; font-weight: bold;">
                    <span>Remise:</span>
                    <span>-€${promoDiscount.toFixed(2)}</span>
                </div>
            `;
        }
    }

    function verifyPromoCode(code) {
        // Single promo code - modify these values as needed
        const ACTIVE_PROMO_CODE = "CAN25";
        const costummerCode = "RAM26"
        let DISCOUNT_PERCENTAGE = 0.10; // 10%
        
        if (code === ACTIVE_PROMO_CODE) {
            if (!promoApplied) {
                applyPromo(DISCOUNT_PERCENTAGE);
            } else {
                alert("Code promo déjà appliqué!");
            }
        }
        else if (code === costummerCode) {
            DISCOUNT_PERCENTAGE = 0.15 ;
            if (!promoApplied) {
                applyPromo(DISCOUNT_PERCENTAGE);
            } else {
                alert("Code promo déjà appliqué!");
            }
        } else if (code === "") {
            // Empty - do nothing
        } else {
            alert("Code promo invalide!");
        }
    }

    function applyPromo(discountPercentage) {
        const totalElement = document.querySelector(".order_total_price");
        let totalText = totalElement.innerText;
        let total = parseFloat(totalText.replace('€', '').trim());
        
        // Calculate discount
        promoDiscount = total * discountPercentage;
        
        // Apply discount
        const discountedTotal = total - promoDiscount;
        totalElement.innerText = discountedTotal.toFixed(2) + " €";
        
        promoApplied = true;
        
        // Show discount info
        showDiscountInfo();
        
        alert(`Code promo appliqué! Réduction de ${(discountPercentage * 100)}%`);
    }

    function handlePromoEnter(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = document.getElementById("promo_code").value.trim().toUpperCase();
            verifyPromoCode(code);
        }
    }

    function setupPromoCodeLogic() {
        const promoCodeInput = document.getElementById("promo_code");
        
        // Clear input
        promoCodeInput.value = "";
        
        // Remove any existing listener
        promoCodeInput.removeEventListener('keydown', handlePromoEnter);
        
        // Add new listener for Enter key only
        promoCodeInput.addEventListener('keydown', handlePromoEnter);
        
        
        const applyBtn = document.querySelector('.apply-promo-btn');

        applyBtn.addEventListener('click', () => {
            const code = promoCodeInput.value.trim().toUpperCase();
            verifyPromoCode(code);
        });
        
    }

    function setupTrashListeners() {
        const trashs = document.querySelectorAll("#basket .trash");
        
        trashs.forEach(trash => {
            // Clone to remove old listeners
            const newTrash = trash.cloneNode(true);
            trash.parentNode.replaceChild(newTrash, trash);
            
            newTrash.addEventListener('click', () => {
                removeItems(newTrash.classList[1]);
            });
        });
    }

    function resetBasketUI() {
        const confirme_order = document.querySelector('#basket > button');
        confirme_order.innerText = "Confirmer";
        confirme_order.setAttribute("class", "confirmer_l_ordre");
        
        document.querySelector("#basket .order_details").style.display = "grid";
        document.querySelector(".client-info").style.display = "none";
        
        // Clear promo input if visible
        const promoInput = document.getElementById("promo_code");
        if (promoInput) promoInput.value = "";
        

    }

    function openBasket() {
        if (basket) {
            basket.style.display = "grid";
            if (overlay) overlay.style.display = "block";
            renderBasketItems();
        }

        // Reset to initial state
        resetBasketUI();
        
        // Setup confirm button for STEP 1
        const confirme_order = document.querySelector('#basket .confirmer_l_ordre');
        
        // Remove existing listeners to prevent duplicates
        const newConfirmBtn = confirme_order.cloneNode(true);
        confirme_order.parentNode.replaceChild(newConfirmBtn, confirme_order);
        
        newConfirmBtn.addEventListener('click', () => {
            if (total_order.length > 0) {
                // STEP 2: Show client info WITH promo section
                document.querySelector("#basket .order_details").style.display = "none";
                document.querySelector(".client-info").style.display = "grid"; // This includes promo
                
                newConfirmBtn.innerText = "Passer la commande";
                newConfirmBtn.setAttribute("class", "place_order");
                
                // Setup promo code logic
                setupPromoCodeLogic();
                
                // Setup place order button
                const place_order = document.querySelector(".place_order");
                place_order.addEventListener('click', handlePlaceOrder);
                
            } else {
                alert("Ton panier est vide !");
            }
        });

        // Setup trash functionality
        setupTrashListeners();
    }

    function handlePlaceOrder() {
        console.log("ssssss")
        // Don't clear promo here - let confirmOrder handle it
        confirmOrder();
    }

    function closeBasket() {
        if (basket) {
            basket.style.display = "none";
            if (overlay) overlay.style.display = "none";
        }
        
        const details_basket = document.querySelectorAll("details")
        if ( details_basket ) {
            details_basket.forEach(det => {
                det.open = false;
            });
        }
    }

    // --- HOME BUTTON (Always active) ---
    function setupHomeButton() {
        if (homeButton) {
            homeButton.forEach(button => {
                button.addEventListener('click', () => {
                    // Update browser history
                    history.pushState({ page: 'home' }, "", "?page=home");
                    
                    loadHomePage();
                });
            });
        }
    }

    function loadHomePage() {
        fetch('./home.ejs')
            .then(response => {
                if (!response.ok) throw new Error("Home page not found");
                return response.text();
            })
            .then(html => {
                document.getElementById('containner').innerHTML = html;
                
                // Close any open popup
                closePopup();
                
                // Close basket if open
                closeBasket();
                
                closeOthersPopup();
                
                // Reinitialize navigation
                setupNavigation();
                
                autoScroll();
                
                // Reset scrolling
                body.style.overflow = '';
                
                // Update current page state
                currentPage = 'home';
            })
            .catch(error => console.error('Error loading home page:', error));
    }

    // --- NAVIGATION (For loading pages) ---
    function setupNavigation() {
        const categories_div = document.querySelectorAll("#menus > div");

        const ads = document.querySelectorAll("#new_products img ");

        ads.forEach(img => {
            img.addEventListener('click', () => {
                let name = img.className;
                let fileName = name;
                if (name === "burgers") fileName = "burger";
                fileName = fileName + ".ejs";

                // Update browser history
                history.pushState({ page: name }, "", `?page=${name}`);
                
                loadPage(fileName, name);
                });
        });
        
        categories_div.forEach(div => {
            div.addEventListener('click', () => {
                let name = div.querySelector("div").className;
                let fileName = name;
                if (name === "burgers") fileName = "burger";
                fileName = fileName + ".ejs";

                // Update browser history
                history.pushState({ page: name }, "", `?page=${name}`);
                
                loadPage(fileName, name);
                });
        });
    }


    function loadPage(fileName, pageName) {
        fetch("./" + fileName)
            .then(response => {
                if (!response.ok) throw new Error("Page not found");
                return response.text();
            })
            .then(html => {
                document.getElementById('containner').innerHTML = html;
                
                // Close any open popup
                closePopup();
                
                // Close basket if open
                closeBasket();
                
                closeOthersPopup();
                
                // Setup page-specific logic
                setupPageSpecificLogic();
                window.scrollTo(0, 0);
                
                // Update current page state
                currentPage = pageName;
            })
            .catch(error => console.error('Error loading page:', error));
    }

    // --- PAGE-SPECIFIC LOGIC (Temporary - resets with page change) ---
    function setupPageSpecificLogic() {
        const currentPage = document.querySelector("#sections h1");
        if (!currentPage) return;

        currentSelection = null; // Reset current selection

        if (currentPage.classList.contains("burgers")) {
            setupBurgerLogic();
        } else if (currentPage.classList.contains("tacos")) {
            setupTacosLogic();
        } else {
            setupOthersLogic()
        }

        
        const popup = document.querySelector('.pop_up');
        const quantityPopup = document.querySelector('.quantity_popup');
        
        if (popup) {
            popup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        if (quantityPopup) {
            quantityPopup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // scroll over to the required element missing
    function scrollToRequired(selector) {
        const popUp = document.querySelector(".pop_up")

        const el = document.querySelector(selector);
        if (!el) return;
  
        const headerOffset = 80; // height of fixed header
        let y = el.getBoundingClientRect().top - popUp.getBoundingClientRect().top + popUp.scrollTop;

        popUp.scrollTo({
            top: y-30,
            behavior: "smooth"
        });
    }

    // --- QuantityPopUp MANAGEMENT (Temporary - tied to current page) ---
    function openOthersPopup( QpopUp, itemTitle, basePrice , categorie) {
        QpopUp.querySelector("img").setAttribute( "src" , `./medias/${categorie}/${itemTitle}.jpg`);

        if (!QpopUp) return;
        
        // Initialize current selection
        currentSelection = {
            selection_num : 0,
            itemNme: itemTitle,
            meatCooking: '',
            sauceChoisis: "",
            priceSize: 0,
            supplements: {},
            extras: {},
            total: parseFloat(basePrice),
            itemCount: ''
        };
        
        body.style.overflow = 'hidden';
        if (overlay) overlay.style.display = "block";
        QpopUp.style.display = 'grid';

        // Setup initial  display
        const total = QpopUp.querySelector('.total');
        if (total) {
            total.textContent = currentSelection.total.toFixed(2) + " €";
        }
    }

    // --- POPUP MANAGEMENT (Temporary - tied to current page) ---
    function openPopup(popUp, itemTitle, basePrice) {
        if (!popUp) return;
        
        // Initialize current selection
        currentSelection = {
            selection_num : 0,
            itemNme: itemTitle,
            meatCooking: 'Cordon bleu',
            sauceChoisis: "",
            priceSize: 0,
            supplements: {},
            extras: {},
            total: parseFloat(basePrice),
            itemCount: ''
        };

        const radioButtons = document.querySelectorAll('input[name="sauce"]');
        if ( radioButtons ) {
            radioButtons.forEach(radio => {
                radio.checked = false;
            });            
        }
        
        body.style.overflow = 'hidden';
        if (overlay) overlay.style.display = "block";
        popUp.style.display = 'grid';
        popUp.removeEventListener('transitionend', closePopupHandler);
        popUp.style.transform = 'translateY(0%)';
        
        // Setup initial resume display
        const resumeDiv = popUp.querySelector('.resume');
        if (resumeDiv) {
            resumeDiv.querySelector('.total').textContent = currentSelection.total.toFixed(2) + " €";
        }
    }

    function closePopupHandler() {
        const popUp = document.querySelector('.pop_up');
        if (popUp) {
            popUp.style.display = 'none';
            popUp.removeEventListener('transitionend', closePopupHandler);
        }
        body.style.overflow = '';
        if (overlay) overlay.style.display = "none";
    }

    function closePopup() {
        const popUp = document.querySelector('.pop_up');
        if (popUp) {
            popUp.scrollTop = 0;
            popUp.style.transform = 'translateY(100%)';
            popUp.addEventListener('transitionend', closePopupHandler, { once: true });
        }
        currentSelection = null; // Clear current selection
    }

    function closeOthersPopup() {
        const popUp = document.querySelector('.quantity_popup');
        if (popUp) {
            popUp.style.display = 'none';
        }

        if (overlay) overlay.style.display = "none";
        body.style.overflow = ''; // Add this line to restore scrolling
        currentSelection = null; // Clear current selection
    }

    // OTHERS LOGICS  
    function setupOthersLogic() {
        const othersItems = document.querySelectorAll('#item_menu > div');
        const quantity_popUp = document.querySelector('.quantity_popup');
        const categorie = document.querySelector('#sections h1').className ;
        
        if (!quantity_popUp || !othersItems.length) return;

        // Handle Clicks Outside of Pop-up
        document.addEventListener('click', (event) => {
            const target = event.target; 
            const isItem = target.closest('#item_menu > div'); 
        
            if (quantity_popUp.style.display === 'grid' && 
                !quantity_popUp.contains(target) &&
                !isItem) {
                    closeOthersPopup()
                }
        });

        othersItems.forEach(item => {
            item.addEventListener('click', () => {
                const title = item.querySelector('.title').innerText
                    .replace(item.querySelector('.title span').innerText, '')
                    .trim();
                const priceText = item.querySelector('.prix').innerText;
                
                openOthersPopup(quantity_popUp, title, priceText, categorie);
                setupOthersPopupLogic(quantity_popUp);
            });
        });
    }

    // --- BURGER LOGIC (Page-specific) ---
    function setupBurgerLogic() {
        const burgerItems = document.querySelectorAll('#item_menu > div');
        const popUp = document.querySelector('.pop_up');
        
        if (!popUp || !burgerItems.length) return;

        // Handle Clicks Outside of Pop-up
        document.addEventListener('click', (event) => {
            const target = event.target; 
            const isBurgerItem = target.closest('#item_menu > div'); 
        
            if (popUp.style.display === 'grid' && 
                !popUp.contains(target) &&
                !isBurgerItem) {
                closePopup(); 
            }
        });

        burgerItems.forEach(item => {
            item.addEventListener('click', () => {
                const title = "Burger " + item.querySelector('.title').innerText
                    .replace(item.querySelector('.title span').innerText, '')
                    .trim();
                const priceText = item.querySelector('.prix').innerText;
                
                openPopup(popUp, title, priceText);
                setupPopupLogic(popUp, 'burger');
            });
        });
    }

    // --- TACOS LOGIC (Page-specific) ---
    function setupTacosLogic() {
        const tacoItems = document.querySelectorAll('#item_menu > div');
        const popUp = document.querySelector('.pop_up');
        
        if (!popUp || !tacoItems.length) return;

        // Handle Clicks Outside of Pop-up
        document.addEventListener('click', (event) => {
            const target = event.target; 
            const isBurgerItem = target.closest('#item_menu > div'); 
        
            if (popUp.style.display === 'grid' && 
                !popUp.contains(target) &&
                !isBurgerItem) {
                closePopup(); 
            }
        });

        tacoItems.forEach(item => {
            item.addEventListener('click', () => {
                const title = "Tacos " +item.querySelector('.title').innerText
                    .replace(item.querySelector('.title span').innerText, '')
                    .trim();
                const priceText = item.querySelector('.prix').innerText;
                
                openPopup(popUp, title, priceText);
                setupPopupLogic(popUp, 'taco');
            });
        });
    }

    function setupOthersPopupLogic(popUp) {
        if (!popUp || !currentSelection) return;
        
        // Setup quantity selectors
        setupQuantitySelectors(popUp);
        
        // Setup confirmation button
        const confirmButton = popUp.querySelector('.confirmer_les_choix');
        if (confirmButton) {
            // Remove any existing listeners
            const newConfirmButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
            
            newConfirmButton.addEventListener('click', () => {
                let all_good = true ;

                if (currentSelection && all_good) {
                    // Add to global orders
                    currentSelection.selection_num = total_order.length;
                    total_order.push({...currentSelection});
                    
                    // Update basket display
                    updateBasketDisplay(currentSelection);
                    
                    
                    // Close popup
                    closeOthersPopup()
                }
            });
        }
        
        // Initial resume update
        updateResume(popUp);
    }

    // --- POPUP LOGIC (Shared for burger and taco) ---
    function setupPopupLogic(popUp, type) {
        if (!popUp || !currentSelection) return;

        popUp.querySelector('.meat_cook_p').style.display = "flex" ;
        popUp.querySelector('.meat_cook').style.display = "flex" ;
        
        // Setup meat cooking/size options
        const meatCookOptions = popUp.querySelectorAll('.meat_cook > div');
        if (meatCookOptions.length && ( !currentSelection.itemNme.includes("bleu") || type === 'taco'  )) {
            // Set default selection
            meatCookOptions.forEach(opt => opt.classList.remove('selected'));
            const defaultOption = type === 'taco' ? 
                meatCookOptions[meatCookOptions.length - 1] : // Last for taco (M size)
                meatCookOptions[1]; // second for burger (boeuf)
                
            defaultOption.classList.add('selected');
            currentSelection.meatCooking = defaultOption.querySelector('p').textContent.trim();
            
            if (type === 'taco') {
                currentSelection.priceSize = getTacosSizePrice(currentSelection.meatCooking);
                currentSelection.total += currentSelection.priceSize;
            }
            
            // Add event listeners
            meatCookOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const oldValue = currentSelection.meatCooking;
                    const oldPrice = type === 'taco' ? getTacosSizePrice(oldValue) : 0;
                    
                    meatCookOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    
                    const newValue = option.querySelector('p').textContent.trim();
                    currentSelection.meatCooking = newValue;
                    
                    if (type === 'taco') {
                        const newPrice = getTacosSizePrice(newValue);
                        currentSelection.priceSize = newPrice;
                        currentSelection.total = currentSelection.total - oldPrice + newPrice;
                        updateResume(popUp);
                    } else {
                        updateResume(popUp);
                    }
                });
            });
        }
        
        // Setup sauce selection (for tacos)
        if (type === 'taco') {
            const radioSauce = popUp.querySelectorAll('.tacos_sauce > div');
            if (radioSauce.length) {
                radioSauce.forEach(sauce => {
                    const radioInput = sauce.querySelector('input');
                    sauce.addEventListener('click', () => {
                        radioSauce.forEach(otherSauce => {
                            if (otherSauce !== sauce) {
                                otherSauce.querySelector('input').checked = false;
                            }
                        });
                        radioInput.checked = true;
                        currentSelection.sauceChoisis = radioInput.value;
                        updateResume(popUp);
                    });
                });
            }
        }

        if ( currentSelection.itemNme.includes("bleu") && type === "burger") {
            popUp.querySelector('.meat_cook_p').style.display = "none" ;
            popUp.querySelector('.meat_cook').style.display = "none" ;
        }
        
        // Setup quantity selectors
        setupQuantitySelectors(popUp);
        
        // Setup confirmation button
        const confirmButton = popUp.querySelector('.confirmer_les_choix');
        if (confirmButton) {
            // Remove any existing listeners
            const newConfirmButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
            
            newConfirmButton.addEventListener('click', () => {
                let all_good = true ;
                // verify required choices , ( Tacos sauce , Tacos size , meat cook )
                if ( type == 'taco') {
                    if ( !currentSelection.sauceChoisis ) {
                        // block confirmation 
                        all_good = false
                        //alert that you have to choice a sauce 
                        alert('Vous avez oublié de choisir une sauce !')
                        //rescroll to the sauces section
                        const section_title ="#containner_tacos .tacos_sauce_title"
                        scrollToRequired(section_title)
                        }
                        else {
                            //allow confirmation if all is good 
                            all_good = true
                        }
                    }

                if (currentSelection && all_good) {
                    // Add to global orders
                    currentSelection.selection_num = total_order.length;
                    total_order.push({...currentSelection});
                    
                    // Update basket display
                    updateBasketDisplay(currentSelection);
                    
                    
                    // Close popup
                    closePopup();
                }
            });
        }
        
        // Initial resume update
        updateResume(popUp);
    }

    function setupQuantitySelectors(element) {
        const quantitySelectors = element.querySelectorAll('.quantity-selector');
        
        // Clear any existing event listeners by cloning and replacing
        quantitySelectors.forEach(selector => {
            const newSelector = selector.cloneNode(true);
            selector.parentNode.replaceChild(newSelector, selector);
        });
        
        // Get fresh references after cloning
        const freshSelectors = element.querySelectorAll('.quantity-selector');
        
        freshSelectors.forEach(selector => {
            const name = getItemNameFromData(selector);
            const category = determineCategory(name, element);
            let itemPrice = getExtraPrice(name);
            const others_name = currentSelection.itemNme;

            if ( currentSelection.meatCooking.length < 1 ) {
                itemPrice = currentSelection.total;
            }
            
            if (currentSelection.meatCooking.length < 1 && currentSelection) {
                let item_count = parseFloat(others_name);
                const quantitySpan = selector.querySelector('.quantity');
                const minusButton = selector.querySelector('.minus');
                const plusButton = selector.querySelector('.plus');
                
                if (!item_count) {
                    item_count = 1;
                }

                // Set initial display
                quantitySpan.textContent = item_count;
                
                // Plus button
                plusButton.addEventListener('click', () => {
                    let quantity = parseInt(quantitySpan.textContent);
                    quantity++;
                    
                    // Update price if it's an extra
                    if (itemPrice > 0) {
                        let result = currentSelection.total + itemPrice;
                        currentSelection.total = parseFloat(result.toFixed(2));
                    }
                    
                    quantitySpan.textContent = quantity;
                    currentSelection.itemCount = " x " + quantity ;
                    updateResume(element);
                });
                
                // Minus button
                minusButton.addEventListener('click', () => {
                    let quantity = parseInt(quantitySpan.textContent);
                    if (quantity > 1) {
                        quantity--;
                        
                        // Update price if it's an extra
                        if (itemPrice > 0) {
                            let result = currentSelection.total - itemPrice;
                            currentSelection.total = parseFloat(result.toFixed(2));
                        }
                        
                        quantitySpan.textContent = quantity;
                        currentSelection.itemCount = "x" + quantity;
                        updateResume(element);
                    }
                });
            }

            if (name && currentSelection) {
                // Initialize in current selection
                if (currentSelection[category][name] === undefined) {
                    currentSelection[category][name] = 0;
                }
                
                const quantitySpan = selector.querySelector('.quantity');
                const minusButton = selector.querySelector('.minus');
                const plusButton = selector.querySelector('.plus');
                
                // Set initial display
                quantitySpan.textContent = currentSelection[category][name];
                
                // Plus button
                plusButton.addEventListener('click', () => {
                    let quantity = parseInt(quantitySpan.textContent);
                    quantity++;
                    
                    // Update price if it's an extra
                    if (itemPrice > 0) {
                        let result = currentSelection.total + itemPrice;
                        currentSelection.total = parseFloat(result.toFixed(2));
                    }
                    
                    quantitySpan.textContent = quantity;
                    currentSelection[category][name] = quantity;
                    updateResume(element);
                });
                
                // Minus button
                minusButton.addEventListener('click', () => {
                    let quantity = parseInt(quantitySpan.textContent);
                    if (quantity > 0) {
                        quantity--;
                        
                        // Update price if it's an extra
                        if (itemPrice > 0) {
                            let result = currentSelection.total - itemPrice;
                            currentSelection.total = parseFloat(result.toFixed(2));
                        }
                        
                        quantitySpan.textContent = quantity;
                        currentSelection[category][name] = quantity;
                        updateResume(element);
                    }
                });
            }
        });
    }

    function updateResume(popUp) {
        if (!popUp || !currentSelection) return;

        // update total for others
        const other_elements_total = document.querySelector('.quantity_popup .total')
        if ( other_elements_total ) {
            other_elements_total.textContent = currentSelection.total.toFixed(2) + " €";
        }

        const resumeDiv = popUp.querySelector('.resume');
        if ( resumeDiv) {
            // Update meat cooking/size
            const meatCookingP = resumeDiv.querySelector('.meat_cook_resume');
            if (meatCookingP) {
                meatCookingP.textContent = currentSelection.meatCooking;
            }
            
            // Update sauce (for tacos)
            const sauceChoisis = resumeDiv.querySelector('.sauce');
            if (sauceChoisis) {
                sauceChoisis.textContent = currentSelection.sauceChoisis || '';
            }
            
            // Update supplements
            const supplementsUl = resumeDiv.querySelector('ul:nth-of-type(1)');
            if (supplementsUl) {
                let suppsList = [];
                for (const [name, quantity] of Object.entries(currentSelection.supplements)) {
                    if (quantity > 0) {
                        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                        suppsList.push(`<li>${displayName} x${quantity}</li>`);
                    }
                }
                supplementsUl.innerHTML = suppsList.join('') || '<li>N/A</li>';
            }
            
            // Update extras
            const extrasUl = resumeDiv.querySelector('ul:nth-of-type(2)');
            if (extrasUl) {
                let extrasList = [];
                for (const [name, quantity] of Object.entries(currentSelection.extras)) {
                    if (quantity > 0) {
                        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                        extrasList.push(`<li>${displayName} x${quantity}</li>`);
                    }
                }
                extrasUl.innerHTML = extrasList.join('') || '<li>N/A</li>';
            }
            
            // Update total
            const totalEl = resumeDiv.querySelector('.total');
            if (totalEl) {
                totalEl.textContent = currentSelection.total.toFixed(2) + " €";
            }
        }
    }

    // --- INITIAL SETUP ---
    function initialize() {
        // Check URL for initial page
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        
        if (page) {
            // Load from URL parameter
            if (page === 'home') {
                loadHomePage();
            } else {
                let fileName = page;
                if (page === 'burgers') fileName = 'burger';
                fileName = fileName + ".ejs";
                loadPage(fileName, page);
            }
        } else {
            // Default to home page with history
            history.replaceState({ page: 'home' }, "", "?page=home");
            loadHomePage();
        }
        
        // Setup basket toggle
        if (basket_button) {
            basket_button.addEventListener('click', openBasket);
        }
        
        // Close basket when clicking outside
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            if (basket && basket.style.display === 'grid' && 
                !basket.contains(target) &&
                target !== basket_button && 
                !basket_button.contains(target)) {
                closeBasket();
            }
            
            // Close popup when clicking outside
            const popUp = document.querySelector('.pop_up');
            if (popUp && popUp.style.display === 'grid' && 
                !popUp.contains(target) &&
                !target.closest('#item_menu > div')) {
                closePopup();
            }
        });

        // Disable scroll restoration
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        
        // Setup initial navigation
        setupNavigation();
    }


    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            const page = event.state.page;
            
            if (page === 'home') {
                loadHomePage();
            } else {
                let fileName = page;
                if (page === 'burgers') fileName = 'burger';
                fileName = fileName + ".ejs";
                loadPage(fileName, page);
            }
        } else {
            // Default to home page
            loadHomePage();
        }
    });
    // Start everything
    initialize();
    // Setup always-active elements
    setupHomeButton();
});
