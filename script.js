/* ==================== ASSISTENTE DIGITALE - MODERN JAVASCRIPT ==================== */

// ==================== GLOBAL CONFIGURATION ==================== 
const CONFIG = {
    FORM_ENDPOINT: '/api/contact',
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 5000,
    SCROLL_THRESHOLD: 100,
    MOBILE_BREAKPOINT: 768,
    INTERSECTION_THRESHOLD: 0.1,
    INTERSECTION_MARGIN: '50px'
};

// Chat functions - Devono essere disponibili immediatamente per onclick HTML
window.openChatWidgetInternal = function() {
    console.log('🤖 openChatWidgetInternal chiamata');
    const chatContainer = document.getElementById('chatContainer');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatNotification = document.querySelector('.chat-notification');
    
    if (chatContainer && chatToggleBtn) {
        chatContainer.classList.add('active');
        chatToggleBtn.classList.add('active');
        
        if (chatNotification) {
            chatNotification.style.display = 'none';
        }
        
        sessionStorage.setItem('chatNotificationShown', 'true');
        console.log('🤖 Chat aperta dalla funzione globale');
    } else {
        console.warn('⚠️ Elementi chat non trovati ancora, riprovo tra 500ms');
        setTimeout(window.openChatWidgetInternal, 500);
    }
};

window.closeChatWidget = function() {
    console.log('🤖 closeChatWidget chiamata');
    const chatContainer = document.getElementById('chatContainer');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    
    if (chatContainer && chatToggleBtn) {
        chatContainer.classList.remove('active');
        chatToggleBtn.classList.remove('active');
        console.log('🤖 Chat chiusa dalla funzione globale');
    }
};

// Alias per compatibilità HTML
window.openChat = window.openChatWidgetInternal;

// Form functions
window.resetForm = function() {
    console.log('📄 resetForm chiamata');
    const form = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');
    
    if (form && successMessage) {
        form.style.display = 'block';
        successMessage.style.display = 'none';
        form.reset();
        
        // Reset stato submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
        
        console.log('📄 Form reset completato');
    }
};

console.log('✅ Funzioni globali caricate IMMEDIATAMENTE');


// ==================== STATE MANAGEMENT ==================== 
let isSubmitting = false;
let isInitialized = false;

// ==================== DOM READY INITIALIZATION ==================== 
document.addEventListener('DOMContentLoaded', function() {
    if (!isInitialized) {
        // Aspetta che l'header sia caricato prima di inizializzare
        if (document.getElementById('header')) {
            // Header già presente (pagina statica)
            initializeApplication();
            isInitialized = true;
        } else {
            // Aspetta l'evento di caricamento header
            window.addEventListener('headerLoaded', function() {
                setTimeout(() => {
                    initializeApplication();
                    isInitialized = true;
                }, 100);
            }, { once: true });
            
            // Fallback: inizializza dopo 2 secondi comunque
            setTimeout(() => {
                if (!isInitialized) {
                    console.log('⚠️ Timeout header, inizializzo comunque...');
                    initializeApplication();
                    isInitialized = true;
                }
            }, 2000);
        }
    }
});

// ==================== MAIN APPLICATION INITIALIZATION ==================== 
function initializeApplication() {
    try {
        // Core functionality
        initializeHeader();
        initializeMobileNavigation();
        initializeSmoothScrolling();
        initializeContactForm();
        initializeAnimations();
        initializeAccessibility();
        initializePerformanceTracking();
        
        console.log('🚀 Assistente Digitale - Inizializzazione completata con successo');
    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        showNotification('Si è verificato un errore durante il caricamento della pagina', 'error');
    }
}

// ==================== HEADER SCROLL EFFECTS ==================== 
function initializeHeader() {
    // Funzione di controllo ricorsiva con timeout
    const checkHeader = (attempts = 0) => {
        const header = document.getElementById('header');
        if (!header) {
            if (attempts < 10) {
                console.warn(`⚠️ Header element non trovato, tentativo ${attempts + 1}/10`);
                setTimeout(() => checkHeader(attempts + 1), 200);
            } else {
                console.error('❌ Header element non trovato dopo 10 tentativi');
            }
            return;
        }
        
        console.log('✅ Header trovato, inizializzo scroll effects');
        
        let ticking = false;
        
        function updateHeaderState() {
            const scrollPosition = window.scrollY || window.pageYOffset;
            
            if (scrollPosition > CONFIG.SCROLL_THRESHOLD) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
        
        // Optimized scroll handler with requestAnimationFrame
        function handleScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateHeaderState();
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        updateHeaderState(); // Initial call
    };
    
    checkHeader();
}

// ==================== MOBILE NAVIGATION ==================== 
function initializeMobileNavigation() {
    console.log('🔍 Inizializzazione navigazione mobile...');
    
    // Aspetta che gli elementi siano nel DOM
    const checkMobileNav = (attempts = 0) => {
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (!mobileToggle || !navMenu) {
            if (attempts < 15) {
                console.warn(`⚠️ Elementi navigazione mobile non trovati, tentativo ${attempts + 1}/15`);
                setTimeout(() => checkMobileNav(attempts + 1), 200);
            } else {
                console.error('❌ Elementi navigazione mobile non trovati dopo 15 tentativi');
                console.log('🔍 Elementi presenti nel DOM:', {
                    mobileToggle: !!document.getElementById('mobileMenuToggle'),
                    navMenu: !!document.getElementById('navMenu'),
                    allButtons: document.querySelectorAll('button').length,
                    allIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
                });
            }
            return;
        }
        
        console.log('✅ Navigazione mobile trovata:', {
            toggleId: mobileToggle.id,
            menuId: navMenu.id,
            toggleVisible: getComputedStyle(mobileToggle).display !== 'none'
        });
        
        let isMenuOpen = false;
        
        // RIMUOVI event listener esistenti per evitare conflitti
        const existingHandler = mobileToggle.getAttribute('data-handler-added');
        if (existingHandler) {
            console.log('⚠️ Handler già presente, skip...');
            return;
        }
        
        // Toggle menu function
        function handleMobileToggle(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isMenuOpen = !isMenuOpen;
            
            navMenu.classList.toggle('active', isMenuOpen);
            mobileToggle.classList.toggle('active', isMenuOpen);
            mobileToggle.setAttribute('aria-expanded', isMenuOpen.toString());
            
            // Update icon
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = isMenuOpen ? 'fas fa-times' : 'fas fa-bars';
            }
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = isMenuOpen ? 'hidden' : '';
            document.body.classList.toggle('menu-open', isMenuOpen);
            
            console.log(`📱 Mobile menu ${isMenuOpen ? 'APERTO' : 'CHIUSO'}`);
        }
        
        // Close menu function
        function closeMobileMenu() {
            if (!isMenuOpen) return;
            
            isMenuOpen = false;
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
            mobileToggle.setAttribute('aria-expanded', 'false');
            
            const icon = mobileToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
            
            document.body.style.overflow = '';
            document.body.classList.remove('menu-open');
            console.log('📱 Mobile menu chiuso');
        }
        
        // ✅ AGGIUNGI EVENT LISTENER UNICO
        mobileToggle.addEventListener('click', handleMobileToggle);
        mobileToggle.setAttribute('data-handler-added', 'true');
        
        // Close menu when clicking navigation links
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (isMenuOpen && !mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Close menu on resize to desktop
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT) {
                closeMobileMenu();
            }
        }, 250));
        
        // Close menu with ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMobileMenu();
            }
        });
        
        console.log('✅ Mobile navigation inizializzata completamente');
    };
    
    checkMobileNav();
}

// ==================== SMOOTH SCROLLING ==================== 
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if empty href or just hash
            if (!href || href === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (!targetElement) {
                console.warn(`⚠️ Target element non trovato: ${href}`);
                return;
            }
            
            // Calculate scroll position
            const header = document.getElementById('header');
            const headerHeight = header ? header.offsetHeight : 0;
            const targetPosition = targetElement.offsetTop - headerHeight - 20;
            
            // Smooth scroll to target
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
            
            // Update URL without triggering scroll
            if (history.pushState) {
                history.pushState(null, null, href);
            }
        });
    });
}

// ==================== CONTACT FORM HANDLING ==================== 
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) {
        console.warn('⚠️ Form di contatto non trovato');
        return;
    }
    
    // Form submission handler
    contactForm.addEventListener('submit', handleFormSubmission);
    
    // Fix privacy checkbox SUBITO
    fixPrivacyCheckbox(); // ✅ AGGIUNGI QUESTA RIGA
    
    // Real-time validation for better UX
    const formFields = contactForm.querySelectorAll('input, select, textarea');
    formFields.forEach(field => {
        // Validate on blur (when user leaves field)
        field.addEventListener('blur', () => validateField(field));
        
        // Clear errors on input (when user starts typing)
        field.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                clearFieldError(this);
                validateField(this);
            }
        });
    });
}

// ==================== FORM SUBMISSION HANDLER (AGGIORNATO) ==================== 
async function handleFormSubmission(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('contactForm');
    const formData = new FormData(form);
    
    // VALIDAZIONE PRIVACY CHECKBOX MANUALE
    const privacyCheckbox = document.getElementById('privacy_accepted');
    if (privacyCheckbox && !privacyCheckbox.checked) {
        showErrorMessage('❌ Devi accettare la Privacy Policy per continuare');
        privacyCheckbox.focus();
        return;
    }
    
    // Validazione completa form
    if (!validateCompleteForm(form)) {
        showErrorMessage('❌ Compila tutti i campi obbligatori correttamente.');
        scrollToFirstError(form);
        return;
    }
    
    // Mostra loading
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const data = {
        nome: formData.get('nome'),
        cognome: formData.get('cognome'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        azienda: formData.get('azienda'),
        sito_web: formData.get('sito_web'),
        qualifica: formData.get('qualifica'),
        settore: formData.get('settore'),
        message: formData.get('message'),
        privacy_accepted: privacyCheckbox ? privacyCheckbox.checked : false
    };
    
    console.log('📤 Invio dati direttamente a HubSpot:', data);
    
    try {
        // Invia solo a HubSpot
        const hubSpotSuccess = await submitToHubSpot(data);
        
        if (hubSpotSuccess) {
            console.log('✅ Form inviato con successo a HubSpot');
            showSuccessMessage();
            
            // Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', {
                    event_category: 'Contact',
                    event_label: 'Contact Form Success'
                });
            }
            
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead');
            }
        } else {
            throw new Error('Errore invio HubSpot');
        }
        
    } catch (error) {
        console.error('❌ Errore invio form:', error);
        showErrorMessage('Si è verificato un errore. Riprova più tardi o contattaci direttamente.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// ==================== HUBSPOT INTEGRATION ==================== 
async function submitToHubSpot(data) {
    try {
        console.log('📤 Invio a HubSpot tramite backend:', data);
        
        // ✅ WRAPPA I DATI NELL'OGGETTO PROPERTIES
        const hubspotPayload = {
            properties: data  // ✅ Il backend si aspetta { properties: { ... } }
        };
        
        console.log('📤 Payload per HubSpot:', hubspotPayload);
        
        const response = await fetch('https://assistente-digitale.onrender.com/api/hubspot/create-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(hubspotPayload) // ✅ INVIA L'OGGETTO CORRETTO
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ HubSpot success:', result);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ HubSpot error:', response.status, errorText);
            return false;
        }
        
    } catch (error) {
        console.error('❌ HubSpot submission error:', error);
        return false;
    }
}

// ==================== MESSAGE FUNCTIONS ==================== 
function showSuccessMessage() {
    const form = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');
    
    if (form && successMessage) {
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        console.log('✅ Success message mostrato');
    } else {
        // Fallback con notifica
        showNotification('🎉 Perfetto! La tua richiesta è stata inviata. Ti contatteremo entro 24 ore!', 'success');
    }
}

function showErrorMessage(message) {
    // Usa il sistema di notifiche esistente
    showNotification(message || 'Si è verificato un errore. Riprova più tardi o contattaci direttamente.', 'error');
    
    console.log('❌ Error message mostrato:', message);
}

// ==================== PRIVACY CHECKBOX FIX ==================== 
function fixPrivacyCheckbox() {
    const privacyCheckbox = document.getElementById('privacy_accepted');
    if (privacyCheckbox) {
        // Rimuovi required HTML per evitare errori di validazione browser
        privacyCheckbox.removeAttribute('required');
        privacyCheckbox.removeAttribute('aria-required');
        
        console.log('🔧 Privacy checkbox fixed - required attribute rimosso');
    }
}

// ==================== FORM VALIDATION ==================== 
function validateCompleteForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isFormValid = true;
    
    // Clear all previous errors
    clearAllErrors(form);
    
    // Validate each required field
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isFormValid = false;
        }
    });
    
    return isFormValid;
}

function validateField(field) {
    const value = field.value?.trim() || '';
    const fieldType = field.type;
    const fieldName = field.name;
    const isRequired = field.hasAttribute('required');
    
    // Clear existing error
    clearFieldError(field);
    
    // Check if required field is empty
    if (isRequired && !value) {
        showFieldError(field, 'Questo campo è obbligatorio');
        return false;
    }
    
    // Skip validation if field is empty and not required
    if (!value && !isRequired) return true;
    
    // Field-specific validation
    switch (fieldType) {
        case 'email':
            if (!validateEmail(value)) {
                showFieldError(field, 'Inserisci un indirizzo email valido (es: nome@esempio.com)');
                return false;
            }
            break;
            
        case 'tel':
            if (!validatePhone(value)) {
                showFieldError(field, 'Inserisci un numero di telefono valido (es: +39 123 456 7890)');
                return false;
            }
            break;
    }
    
    // Name validation
    if ((fieldName === 'nome' || fieldName === 'cognome') && value.length < 2) {
        showFieldError(field, 'Deve contenere almeno 2 caratteri');
        return false;
    }
    
    // Company validation (if provided)
    if (fieldName === 'azienda' && value && value.length < 2) {
        showFieldError(field, 'Il nome dell\'azienda deve contenere almeno 2 caratteri');
        return false;
    }
    
    return true;
}

// ==================== VALIDATION HELPERS ==================== 
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Italian mobile number validation
    if (phone.startsWith('+39')) {
        const italianNumber = phone.substring(3).replace(/\s/g, '');
        return italianNumber.length === 10 && /^3\d{9}$/.test(italianNumber);
    }
    
    // Standard Italian mobile (starting with 3)
    if (cleanPhone.startsWith('3') && cleanPhone.length === 10) {
        return /^3\d{9}$/.test(cleanPhone);
    }
    
    // Generic international format
    return cleanPhone.length >= 8 && cleanPhone.length <= 15 && /^[\+]?[0-9]+$/.test(cleanPhone);
}

function sanitizeInput(input) {
    if (!input) return '';
    return input.toString().trim().replace(/[<>]/g, '');
}

// ==================== ERROR HANDLING ==================== 
function showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) existingError.remove();
    
    // Create error element
    const errorElement = document.createElement('span');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    errorElement.style.cssText = `
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
        animation: fadeInUp 0.3s ease-out;
        line-height: 1.4;
    `;
    
    field.parentNode.appendChild(errorElement);
}

function clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) errorElement.remove();
}

function clearAllErrors(form) {
    form.querySelectorAll('.field-error').forEach(error => error.remove());
    form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}

function scrollToFirstError(form) {
    const firstError = form.querySelector('.error');
    if (firstError) {
        firstError.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        firstError.focus();
    }
}

// ==================== SUBMIT BUTTON STATES ==================== 
function updateSubmitButton(state) {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    const btnText = submitBtn.querySelector('span');
    const btnIcon = submitBtn.querySelector('i');
    
    // Reset classes
    submitBtn.className = 'btn-submit';
    
    switch (state) {
        case 'loading':
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (btnText) btnText.textContent = 'Invio in corso...';
            if (btnIcon) btnIcon.className = 'fas fa-spinner fa-spin';
            break;
            
        case 'success':
            submitBtn.disabled = true;
            submitBtn.classList.add('success');
            submitBtn.style.backgroundColor = '#10b981';
            if (btnText) btnText.textContent = 'Richiesta Inviata!';
            if (btnIcon) btnIcon.className = 'fas fa-check';
            break;
            
        case 'error':
            submitBtn.disabled = false;
            submitBtn.classList.add('error');
            submitBtn.style.backgroundColor = '#ef4444';
            if (btnText) btnText.textContent = 'Errore - Riprova';
            if (btnIcon) btnIcon.className = 'fas fa-exclamation-triangle';
            break;
            
        case 'default':
        default:
            submitBtn.disabled = false;
            submitBtn.style.backgroundColor = '';
            if (btnText) btnText.textContent = 'Richiedi Demo Gratuita';
            if (btnIcon) btnIcon.className = 'fas fa-paper-plane';
            break;
    }
}

// ==================== SUCCESS/ERROR HANDLERS ==================== 
function handleSubmissionSuccess(form, result) {
    updateSubmitButton('success');
    
    // Show success message with service status
    let message = '🎉 Perfetto! La tua richiesta è stata inviata.';
    
    if (result.email && result.brevo) {
        message += ' Ti contatteremo entro 24 ore per la demo gratuita.';
    } else if (result.email || result.brevo) {
        message += ' Ti contatteremo al più presto per la demo gratuita.';
    } else {
        message += ' La richiesta è stata registrata, ti contatteremo presto.';
    }
    
    showNotification(message, 'success');
    
    // Scroll to form for better UX
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Log success details
    console.log('✅ Form inviato con successo!');
    console.log('📧 Email:', result.email ? '✅ Inviata' : '⚠️ Non inviata');
    console.log('📋 Brevo:', result.brevo ? '✅ Aggiunto' : '⚠️ Non aggiunto');
    
    // Reset form after delay
    setTimeout(() => {
        form.reset();
        clearAllErrors(form);
        updateSubmitButton('default');
    }, 3000);
}

function handleSubmissionError(errorMessage = '') {
    updateSubmitButton('error');
    
    // User-friendly error messages
    let userMessage;
    
    if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        userMessage = '❌ Problema di connessione. Verifica la tua connessione internet e riprova.';
    } else if (errorMessage.includes('400')) {
        userMessage = '❌ Alcuni dati non sono validi. Controlla i campi e riprova.';
    } else if (errorMessage.includes('500')) {
        userMessage = '❌ Errore del server. Riprova tra qualche minuto.';
    } else if (errorMessage.includes('timeout')) {
        userMessage = '❌ La richiesta ha impiegato troppo tempo. Riprova.';
    } else if (errorMessage.includes('obbligatori')) {
        userMessage = '❌ ' + errorMessage;
    } else {
        userMessage = '❌ Si è verificato un errore. Riprova o contattaci direttamente.';
    }
    
    showNotification(userMessage, 'error');
    
    // Reset button after delay
    setTimeout(() => {
        updateSubmitButton('default');
    }, 4000);
}

// ==================== NOTIFICATION SYSTEM ==================== 
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    
    const colorMap = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icon = iconMap[type] || iconMap.info;
    const bgColor = colorMap[type] || colorMap.info;
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()" aria-label="Chiudi notifica">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Styling
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.25rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        max-width: 420px;
        min-width: 300px;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        font-weight: 500;
        font-size: 0.9rem;
        line-height: 1.5;
        word-wrap: break-word;
    `;
    
    // Style close button
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            margin-left: auto;
            transition: all 0.2s ease;
            flex-shrink: 0;
            opacity: 0.8;
        `;
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            closeBtn.style.opacity = '1';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.opacity = '0.8';
        });
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    const duration = type === 'success' ? CONFIG.NOTIFICATION_DURATION + 2000 : CONFIG.NOTIFICATION_DURATION;
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.4s ease-in';
            setTimeout(() => notification.remove(), 400);
        }
    }, duration);
    
    // Click to dismiss
    notification.addEventListener('click', function(e) {
        if (e.target === notification || e.target.classList.contains('notification-message')) {
            notification.remove();
        }
    });
}

// ==================== SCROLL ANIMATIONS ==================== 
function initializeAnimations() {
    if (!('IntersectionObserver' in window)) {
        console.log('⚠️ IntersectionObserver non supportato');
        return;
    }
    
    const observerOptions = {
        threshold: CONFIG.INTERSECTION_THRESHOLD,
        rootMargin: CONFIG.INTERSECTION_MARGIN
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Elements to animate
    const animatedElements = document.querySelectorAll(`
        .feature-card,
        .application-card,
        .audience-card,
        .ps-item-modern,
        .stat-item,
        .hero-content,
        .section-header,
        .cta-content
    `);
    
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`;
        observer.observe(el);
    });
}

// ==================== ACCESSIBILITY ENHANCEMENTS ==================== 
function initializeAccessibility() {
    // Keyboard navigation detection
    let isUsingKeyboard = false;
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            isUsingKeyboard = true;
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', function() {
        if (isUsingKeyboard) {
            isUsingKeyboard = false;
            document.body.classList.remove('keyboard-navigation');
        }
    });
    
    // Skip to main content link
    createSkipLink();
    
    // Enhance form accessibility
    enhanceFormAccessibility();
}

function createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.textContent = 'Vai al contenuto principale';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        left: -9999px;
        z-index: 999999;
        padding: 0.5rem 1rem;
        background: #002d62;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.left = '1rem';
        this.style.top = '1rem';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.left = '-9999px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
}

function enhanceFormAccessibility() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    // Add aria-labels and descriptions
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const label = form.querySelector(`label[for="${input.id}"]`);
        if (label && !input.getAttribute('aria-label')) {
            input.setAttribute('aria-label', label.textContent);
        }
        
        if (input.hasAttribute('required')) {
            input.setAttribute('aria-required', 'true');
        }
    });
}

// ==================== PERFORMANCE MONITORING ==================== 
function initializePerformanceTracking() {
    // Page load performance
    window.addEventListener('load', function() {
        if ('performance' in window && performance.timing) {
            const perfData = performance.timing;
            const loadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`📊 Pagina caricata in ${loadTime}ms`);
            
            // Core Web Vitals tracking
            if ('getEntriesByType' in performance) {
                const paintMetrics = performance.getEntriesByType('paint');
                paintMetrics.forEach(metric => {
                    console.log(`🎨 ${metric.name}: ${Math.round(metric.startTime)}ms`);
                });
            }
        }
    });
    
    // Global error handling
    window.addEventListener('error', function(e) {
        console.error('JavaScript Error:', {
            message: e.message,
            filename: e.filename,
            line: e.lineno,
            column: e.colno,
            stack: e.error?.stack
        });
    });
    
    // Promise rejection handling
    window.addEventListener('unhandledRejection', function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
        e.preventDefault();
    });
}

// ==================== UTILITY FUNCTIONS ==================== 
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function isMobile() {
    return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
}

function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ==================== CSS ANIMATIONS & STYLES ==================== 
function injectStyles() {
    if (document.querySelector('#assistente-digitale-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'assistente-digitale-styles';
    style.textContent = `
        /* Animations */
        @keyframes slideInRight {
            from { 
                opacity: 0; 
                transform: translateX(100px); 
            }
            to { 
                opacity: 1; 
                transform: translateX(0); 
            }
        }
        
        @keyframes slideOutRight {
            from { 
                opacity: 1; 
                transform: translateX(0); 
            }
            to { 
                opacity: 0; 
                transform: translateX(100px); 
            }
        }
        
        @keyframes fadeInUp {
            from { 
                opacity: 0; 
                transform: translateY(20px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }
        
        /* Accessibility */
        .keyboard-navigation *:focus {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
            border-radius: 4px;
        }
        
        .skip-link:focus {
            left: 1rem !important;
            top: 1rem !important;
        }
        
        /* Form states */
        .loading {
            pointer-events: none;
            opacity: 0.8;
        }
        
        .field-error {
            animation: fadeInUp 0.3s ease-out;
        }
        
        input.error, select.error, textarea.error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }
        
        /* Notification styles */
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .notification {
                left: 1rem !important;
                right: 1rem !important;
                max-width: none !important;
                min-width: auto !important;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ==================== INITIALIZATION COMPLETE ==================== 
// Inject required styles
injectStyles();

console.log('📱 Assistente Digitale - Script caricato e pronto');

// ==================== PUBLIC API ==================== 
if (typeof window !== 'undefined') {
    window.AssistenteDigitale = {
        // Core functions
        showNotification,
        validateEmail,
        validatePhone,
        
        // Utility functions
        debounce,
        throttle,
        isMobile,
        isReducedMotion,
        
        // State
        get isSubmitting() { return isSubmitting; },
        get isInitialized() { return isInitialized; }
    };
}

// ==================== CHAT WIDGET==================== 

document.addEventListener('DOMContentLoaded', function() {
    // ==================== FLOATING CHAT WIDGET ==================== 
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatContainer = document.getElementById('chatContainer');
    const chatNotification = document.querySelector('.chat-notification');
    const chatIframe = document.getElementById('chatIframe');
    
    // FUNZIONE per chiudere correttamente la chat
    function closeChatWidget() {
    if (chatContainer && chatToggleBtn) {
        chatContainer.classList.remove('active');
        chatToggleBtn.classList.remove('active');
        
        // NON ricaricare l'iframe - mantieni lo stato
        console.log('🤖 Chat chiusa');
    }
}
    
    // FUNZIONE per aprire la chat INTERNA
    function openChatWidgetInternal() {
        if (chatToggleBtn && chatContainer) {
            // Apri la chat
            chatContainer.classList.add('active');
            chatToggleBtn.classList.add('active');
            
            // Nascondi la notifica se presente
            if (chatNotification) {
                chatNotification.style.display = 'none';
            }
            
            // Segna notifica come vista
            sessionStorage.setItem('chatNotificationShown', 'true');
            
            console.log('🤖 Chat aperta internamente');
        }
    }
    
    // UNICO event listener per il toggle button
    if (chatToggleBtn && chatContainer) {
        chatToggleBtn.addEventListener('click', function() {
            const isActive = chatContainer.classList.contains('active');
            
            if (isActive) {
                // Chiudi chat
                closeChatWidget();
            } else {
                // CORREZIONE: Usa la funzione interna, non quella globale
                openChatWidgetInternal();
            }
        });
    }
    
    // Chiudi chat con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && chatContainer && chatContainer.classList.contains('active')) {
            closeChatWidget();
        }
    });
    
    // Gestisci comunicazione con iframe per chiusura mobile
    window.addEventListener('message', function(event) {
        if (event.data === 'closeChatWidget') {
            closeChatWidget();
        }
    });
    
    // Assegna le funzioni al global scope per compatibilità
    window.openChatWidgetInternal = openChatWidgetInternal;
    window.closeChatWidget = closeChatWidget;


    
    // Mostra notifica dopo 5 secondi se non già mostrata
    setTimeout(() => {
        if (chatNotification && !sessionStorage.getItem('chatNotificationShown')) {
            chatNotification.style.display = 'flex';
            sessionStorage.setItem('chatNotificationShown', 'true');
            
            // Nascondi notifica dopo 10 secondi se non cliccata
            setTimeout(() => {
                if (chatNotification && chatNotification.style.display !== 'none') {
                    chatNotification.style.animation = 'fadeOut 1s ease-out forwards';
                    setTimeout(() => {
                        chatNotification.style.display = 'none';
                    }, 1000);
                }
            }, 10000);
        }
    }, 5000);
    
    
    // ==================== DEMO BUTTONS ==================== 
    const demoButtons = document.querySelectorAll('.btn-demo-notify');
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const demoType = this.getAttribute('data-demo');
            const messageField = document.getElementById('message');
            if (messageField) {
                messageField.value = `Sono interessato alla demo "${demoType}". Potete notificarmi quando sarà disponibile e inviarmi maggiori informazioni?`;
                document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
                messageField.focus();
            }
        });
    });

    
    // Aggiungi animazione fadeOut per notifiche
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
});

// ==================== INTEGRAZIONI CAROUSEL COMPLETO ==================== 
setTimeout(() => {
    const track = document.getElementById('integrationsTrack');
    if (track) {
        console.log('🔄 Configurazione carousel integrazioni...');
        
        const originalCards = Array.from(track.children);
        console.log(`📊 Trovate ${originalCards.length} cards originali`);
        
        // Duplica le cards per lo scroll infinito
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            track.appendChild(clone);
        });
        
        console.log(`✅ Carousel configurato con ${track.children.length} cards totali`);
        
        // Inizializza il carousel
        initializeIntegrationsCarousel(track, originalCards.length);
        
    } else {
        console.error('❌ Track integrazioni non trovato');
    }
}, 1000);

// ==================== INIZIALIZZAZIONE CAROUSEL INTEGRAZIONI ==================== 
function initializeIntegrationsCarousel(track, originalCardsCount) {
    const carousel = track.parentElement;
    const isMobile = window.innerWidth <= 768;
    const cardWidth = isMobile ? 200 : 224; // 180px + 20px gap mobile, 200px + 24px desktop
    
    // STATE MANAGEMENT
    let isAutoScrollActive = true;
    let userControlTimeout = null;
    let lastInteractionTime = 0;
    let isDragging = false; // NUOVO: traccia stato drag globale
    
    // ==================== AUTO SCROLL CSS-BASED ==================== 
    function enableAutoScroll() {
        if (!isAutoScrollActive || isDragging) return;
        
        track.classList.add('auto-scroll');
        track.style.animationPlayState = 'running';
        console.log('🔄 Auto-scroll CSS attivato');
    }
    
    function disableAutoScroll() {
        track.classList.remove('auto-scroll');
        track.style.animationPlayState = 'paused';
        console.log('⏸️ Auto-scroll disabilitato');
    }
    
    function resumeAutoScrollAfterDelay() {
        clearTimeout(userControlTimeout);
        userControlTimeout = setTimeout(() => {
            if (Date.now() - lastInteractionTime > 3000 && !isDragging) {
                isAutoScrollActive = true;
                
                // Reset transform per permettere all'animazione CSS di ripartire
                track.style.transform = '';
                track.style.transition = '';
                
                enableAutoScroll();
                console.log('▶️ Auto-scroll ripreso dopo inattività');
            }
        }, 3000);
    }
    
    // ==================== MOUSE DRAG (DESKTOP) ==================== 
    function initMouseDrag() {
        let startX = 0;
        let currentX = 0;
        let startTime = 0;
        let startTransformX = 0;
        
        const threshold = 80;
        const maxVelocity = 1.5;
        
        function getCurrentTransformX() {
            const style = getComputedStyle(track);
            const matrix = new DOMMatrix(style.transform);
            return matrix.m41;
        }
        
        function snapToNearestCard(finalX, velocity = 0) {
            const cardIndex = Math.round(Math.abs(finalX) / cardWidth) % originalCardsCount;
            const snapX = -(cardIndex * cardWidth);
            
            track.style.transition = `transform ${velocity > maxVelocity ? '0.2s' : '0.4s'} cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            track.style.transform = `translateX(${snapX}px)`;
            
            setTimeout(() => {
                track.style.transition = '';
                isDragging = false; // Fine drag
                resumeAutoScrollAfterDelay();
            }, velocity > maxVelocity ? 200 : 400);
            
            console.log(`🖱️ Mouse snap to card ${cardIndex}`);
        }
        
        // Mouse events
        carousel.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // BLOCCA TUTTO immediatamente
            isDragging = true;
            isAutoScrollActive = false;
            disableAutoScroll();
            
            startX = e.clientX;
            startTime = Date.now();
            startTransformX = getCurrentTransformX();
            lastInteractionTime = Date.now();
            
            track.style.transition = 'none'; // Nessuna transizione durante drag
            track.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            
            console.log('🖱️ Mouse drag start - TUTTO BLOCCATO');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX;
            const diffX = currentX - startX;
            let newX = startTransformX + diffX;
            
            // Limiti elastici
            const maxLeft = cardWidth;
            const maxRight = -(originalCardsCount * cardWidth + cardWidth);
            
            if (newX > maxLeft) {
                newX = maxLeft - (newX - maxLeft) * 0.3;
            } else if (newX < maxRight) {
                newX = maxRight - (newX - maxRight) * 0.3;
            }
            
            track.style.transform = `translateX(${newX}px)`;
        });
        
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            const diffX = currentX - startX;
            const velocity = Math.abs(diffX) / duration;
            
            const currentTransformX = getCurrentTransformX();
            
            track.style.cursor = 'grab';
            document.body.style.userSelect = '';
            
            console.log('🖱️ Mouse drag end:', { diffX, velocity, duration });
            
            if (Math.abs(diffX) > threshold) {
                // Drag significativo - snap alla card più vicina
                snapToNearestCard(currentTransformX, velocity);
            } else {
                // Drag troppo piccolo - ritorna alla posizione originale
                track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                track.style.transform = `translateX(${startTransformX}px)`;
                setTimeout(() => {
                    track.style.transition = '';
                    isDragging = false; // Fine drag
                    resumeAutoScrollAfterDelay();
                }, 300);
            }
        });
        
        // Previeni selezione del testo durante il drag
        carousel.addEventListener('dragstart', (e) => e.preventDefault());
        
        console.log('🖱️ Mouse drag configurato');
    }
    
    // ==================== TOUCH GESTURES MOBILE ==================== 
    function initTouchGestures() {
        let startX = 0;
        let currentX = 0;
        let startTime = 0;
        let startTransformX = 0;
        
        const threshold = 80;
        const maxVelocity = 1.5;
        
        function getCurrentTransformX() {
            const style = getComputedStyle(track);
            const matrix = new DOMMatrix(style.transform);
            return matrix.m41;
        }
        
        function snapToNearestCard(finalX, velocity = 0) {
            const cardIndex = Math.round(Math.abs(finalX) / cardWidth) % originalCardsCount;
            const snapX = -(cardIndex * cardWidth);
            
            track.style.transition = `transform ${velocity > maxVelocity ? '0.2s' : '0.4s'} cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            track.style.transform = `translateX(${snapX}px)`;
            
            setTimeout(() => {
                track.style.transition = '';
                isDragging = false; // Fine drag
                resumeAutoScrollAfterDelay();
            }, velocity > maxVelocity ? 200 : 400);
            
            console.log(`📱 Touch snap to card ${cardIndex}`);
        }
        
        // Touch events
        carousel.addEventListener('touchstart', (e) => {
            // BLOCCA TUTTO immediatamente
            isDragging = true;
            isAutoScrollActive = false;
            disableAutoScroll();
            
            startX = e.touches[0].clientX;
            startTime = Date.now();
            startTransformX = getCurrentTransformX();
            lastInteractionTime = Date.now();
            
            track.style.transition = 'none'; // Nessuna transizione durante touch
            
            console.log('📱 Touch start - TUTTO BLOCCATO');
        }, { passive: true });
        
        carousel.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            let newX = startTransformX + diffX;
            
            // Limiti elastici
            const maxLeft = cardWidth;
            const maxRight = -(originalCardsCount * cardWidth + cardWidth);
            
            if (newX > maxLeft) {
                newX = maxLeft - (newX - maxLeft) * 0.3;
            } else if (newX < maxRight) {
                newX = maxRight - (newX - maxRight) * 0.3;
            }
            
            track.style.transform = `translateX(${newX}px)`;
        }, { passive: false });
        
        carousel.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            const diffX = currentX - startX;
            const velocity = Math.abs(diffX) / duration;
            
            const currentTransformX = getCurrentTransformX();
            
            console.log('📱 Touch end:', { diffX, velocity, duration });
            
            if (Math.abs(diffX) > threshold) {
                // Swipe significativo - snap alla card più vicina
                snapToNearestCard(currentTransformX, velocity);
            } else {
                // Swipe troppo piccolo - ritorna alla posizione originale
                track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                track.style.transform = `translateX(${startTransformX}px)`;
                setTimeout(() => {
                    track.style.transition = '';
                    isDragging = false; // Fine drag
                    resumeAutoScrollAfterDelay();
                }, 300);
            }
        }, { passive: true });
        
        carousel.addEventListener('touchcancel', () => {
            if (isDragging) {
                track.style.transition = 'transform 0.3s ease-out';
                track.style.transform = `translateX(${startTransformX}px)`;
                setTimeout(() => {
                    track.style.transition = '';
                    isDragging = false; // Fine drag
                    resumeAutoScrollAfterDelay();
                }, 300);
            }
        }, { passive: true });
        
        console.log('📱 Touch gestures configurati');
    }
    
    // ==================== HOVER PAUSE ==================== 
    function initHoverControls() {
        track.addEventListener('mouseenter', () => {
            if (isAutoScrollActive && !isDragging) {
                track.style.animationPlayState = 'paused';
                console.log('⏸️ Hover pause');
            }
        });
        
        track.addEventListener('mouseleave', () => {
            if (isAutoScrollActive && !isDragging) {
                track.style.animationPlayState = 'running';
                console.log('▶️ Hover resume');
            }
        });
    }
    
    // ==================== CARD CLICK INTERACTION ==================== 
    function initCardInteractions() {
        const cards = track.querySelectorAll('.integration-card');
        
        cards.forEach((card, index) => {
            // Aggiungi hover effects avanzati
            card.addEventListener('mouseenter', () => {
                if (isAutoScrollActive && !isDragging) {
                    track.style.animationPlayState = 'paused';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                if (isAutoScrollActive && !isDragging) {
                    track.style.animationPlayState = 'running';
                }
            });
            
            // Click per pausa temporanea (solo se non è stato un drag)
            card.addEventListener('click', (e) => {
                // Se è stata fatta una drag, non triggerare il click
                if (isDragging || Math.abs(e.clientX - (startX || 0)) > 10) {
                    e.preventDefault();
                    return;
                }
                
                lastInteractionTime = Date.now();
                isAutoScrollActive = false;
                disableAutoScroll();
                
                console.log(`🔗 Card clicked: ${card.querySelector('.integration-name')?.textContent || index}`);
                
                // Riprendi dopo 5 secondi
                setTimeout(() => {
                    if (!isDragging) {
                        isAutoScrollActive = true;
                        track.style.transform = '';
                        track.style.transition = '';
                        enableAutoScroll();
                        console.log('▶️ Auto-scroll ripreso dopo click card');
                    }
                }, 5000);
            });
        });
        
        console.log(`🎯 Interactions configurate per ${cards.length} cards`);
    }
    
    // ==================== RESPONSIVE HANDLING ==================== 
    function handleResize() {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            console.log('📱 Resize detected, reinitializing...');
            setTimeout(() => {
                location.reload();
            }, 100);
        }
    }
    
    // ==================== INIZIALIZZAZIONE ==================== 
    // Inizializza controlli per tutti i dispositivi
    initMouseDrag(); // Desktop drag
    initTouchGestures(); // Mobile touch
    initHoverControls();
    initCardInteractions();
    
    // Imposta cursor grab per il track
    track.style.cursor = 'grab';
    
    // Resize handler con debounce
    window.addEventListener('resize', debounce(handleResize, 300));
    
    // Avvia auto-scroll CSS
    enableAutoScroll();
    
    console.log('🎮 Carousel integrazioni inizializzato (FIXED):', {
        originalCardsCount,
        cardWidth,
        isMobile,
        autoScroll: 'CSS Animation con controllo drag',
        interactions: 'Mouse drag + Touch gestures - CONFLITTI RISOLTI',
        controls: 'Drag completo senza interferenze'
    });
}