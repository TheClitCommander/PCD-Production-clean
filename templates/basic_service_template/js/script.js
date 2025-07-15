/* 
 * Main JavaScript for Local Business Website
 * Handles basic interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const setupMobileNav = () => {
        const nav = document.querySelector('nav ul');
        const header = document.querySelector('header');
        
        // Create mobile menu toggle button if it doesn't exist
        if (!document.querySelector('.mobile-toggle')) {
            const mobileToggle = document.createElement('div');
            mobileToggle.className = 'mobile-toggle';
            mobileToggle.innerHTML = '<span></span><span></span><span></span>';
            header.querySelector('.container').appendChild(mobileToggle);
            
            // Add event listener to toggle
            mobileToggle.addEventListener('click', function() {
                this.classList.toggle('active');
                nav.classList.toggle('active');
            });
        }
    };
    
    // Only setup mobile nav for smaller screens
    if (window.innerWidth < 768) {
        setupMobileNav();
    }
    
    // Window resize handler
    window.addEventListener('resize', function() {
        if (window.innerWidth < 768) {
            setupMobileNav();
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80, // Adjust for header
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Form Validation for Contact Form
    const contactForm = document.querySelector('form.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            let isValid = true;
            const requiredFields = contactForm.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                    
                    // Create error message if it doesn't exist
                    let errorMsg = field.parentNode.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'This field is required';
                        field.parentNode.appendChild(errorMsg);
                    }
                } else {
                    field.classList.remove('error');
                    const errorMsg = field.parentNode.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });
            
            // Email validation
            const emailField = contactForm.querySelector('input[type="email"]');
            if (emailField && emailField.value.trim()) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(emailField.value)) {
                    isValid = false;
                    emailField.classList.add('error');
                    
                    let errorMsg = emailField.parentNode.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = 'Please enter a valid email address';
                        emailField.parentNode.appendChild(errorMsg);
                    } else {
                        errorMsg.textContent = 'Please enter a valid email address';
                    }
                }
            }
            
            if (!isValid) {
                e.preventDefault();
            }
        });
        
        // Clear error styling on input
        contactForm.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('input', function() {
                this.classList.remove('error');
                const errorMsg = this.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            });
        });
    }
    
    // Testimonial Rotation (if multiple testimonials)
    const testimonials = document.querySelectorAll('#testimonials .testimonial');
    if (testimonials.length > 2) {
        let currentTestimonial = 0;
        
        // Hide all but first two testimonials
        for (let i = 2; i < testimonials.length; i++) {
            testimonials[i].style.display = 'none';
        }
        
        // Create navigation dots
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'testimonial-dots';
        
        for (let i = 0; i < Math.ceil(testimonials.length / 2); i++) {
            const dot = document.createElement('span');
            dot.className = i === 0 ? 'dot active' : 'dot';
            dot.dataset.index = i;
            dotsContainer.appendChild(dot);
            
            dot.addEventListener('click', function() {
                currentTestimonial = parseInt(this.dataset.index) * 2;
                updateTestimonials();
            });
        }
        
        document.querySelector('#testimonials .container').appendChild(dotsContainer);
        
        // Function to update visible testimonials
        function updateTestimonials() {
            testimonials.forEach((testimonial, index) => {
                testimonial.style.display = 'none';
            });
            
            // Show current pair of testimonials
            testimonials[currentTestimonial].style.display = 'block';
            if (testimonials[currentTestimonial + 1]) {
                testimonials[currentTestimonial + 1].style.display = 'block';
            }
            
            // Update active dot
            document.querySelectorAll('.testimonial-dots .dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === Math.floor(currentTestimonial / 2));
            });
        }
        
        // Auto-rotate testimonials every 8 seconds
        setInterval(function() {
            currentTestimonial += 2;
            if (currentTestimonial >= testimonials.length) {
                currentTestimonial = 0;
            }
            updateTestimonials();
        }, 8000);
    }
});
