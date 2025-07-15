/**
 * Client Portal JavaScript
 * Local Website Builder Project
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();
    
    // Initialize form validation
    initFormValidation();
    
    // Setup password confirmation check
    setupPasswordConfirmation();
    
    // Auto-dismiss alerts after 5 seconds
    setupAutoDismissAlerts();
    
    // Initialize file upload preview
    initFileUploadPreview();
});

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize client-side form validation
 */
function initFormValidation() {
    // Fetch all forms that need validation
    const forms = document.querySelectorAll('.needs-validation');
    
    // Loop over them and prevent submission
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
}

/**
 * Setup password confirmation check
 */
function setupPasswordConfirmation() {
    const newPassword = document.getElementById('new_password');
    const confirmPassword = document.getElementById('confirm_password');
    
    if (newPassword && confirmPassword) {
        confirmPassword.addEventListener('input', function() {
            checkPasswordMatch(newPassword, confirmPassword);
        });
        
        newPassword.addEventListener('input', function() {
            if (confirmPassword.value.length > 0) {
                checkPasswordMatch(newPassword, confirmPassword);
            }
        });
    }
}

/**
 * Check if passwords match and provide visual feedback
 */
function checkPasswordMatch(passwordInput, confirmInput) {
    if (passwordInput.value !== confirmInput.value) {
        confirmInput.setCustomValidity("Passwords don't match");
        confirmInput.classList.add('is-invalid');
        confirmInput.classList.remove('is-valid');
    } else {
        confirmInput.setCustomValidity('');
        confirmInput.classList.remove('is-invalid');
        confirmInput.classList.add('is-valid');
    }
}

/**
 * Setup auto-dismiss for alerts after 5 seconds
 */
function setupAutoDismissAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
}

/**
 * Initialize file upload preview
 */
function initFileUploadPreview() {
    const fileInput = document.getElementById('file');
    const previewContainer = document.getElementById('file-preview-container');
    
    if (fileInput && previewContainer) {
        fileInput.addEventListener('change', function() {
            previewFile(this, previewContainer);
        });
    }
}

/**
 * Preview file before upload
 */
function previewFile(input, previewContainer) {
    previewContainer.innerHTML = '';
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        // Create preview element
        const preview = document.createElement('div');
        preview.className = 'file-preview mt-3';
        
        // Read file and create appropriate preview
        if (file.type.match('image.*')) {
            reader.onload = function(e) {
                preview.innerHTML = `
                    <div class="card">
                        <div class="card-body text-center">
                            <img src="${e.target.result}" class="img-fluid img-thumbnail" style="max-height: 200px;">
                            <p class="mt-2 mb-0">${file.name} (${formatFileSize(file.size)})</p>
                        </div>
                    </div>
                `;
                previewContainer.appendChild(preview);
            };
            reader.readAsDataURL(file);
        } else {
            // For non-image files, show icon based on file type
            let iconClass = 'fa-file';
            
            if (file.type.includes('pdf')) {
                iconClass = 'fa-file-pdf';
            } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                iconClass = 'fa-file-word';
            } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                iconClass = 'fa-file-excel';
            } else if (file.type.includes('text')) {
                iconClass = 'fa-file-alt';
            } else if (file.type.includes('zip') || file.type.includes('compressed')) {
                iconClass = 'fa-file-archive';
            }
            
            preview.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas ${iconClass} fa-3x text-muted mb-3"></i>
                        <p class="mb-0">${file.name} (${formatFileSize(file.size)})</p>
                    </div>
                </div>
            `;
            previewContainer.appendChild(preview);
        }
    }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Show loading state on buttons when clicked
 */
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('btn-with-loader') && !event.target.classList.contains('btn-loading')) {
        const originalText = event.target.innerHTML;
        event.target.setAttribute('data-original-text', originalText);
        event.target.classList.add('btn-loading');
        event.target.innerHTML = originalText + ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
});

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.querySelector(`[data-password-toggle="${inputId}"] i`);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Handle confirmation dialogs
 */
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}
