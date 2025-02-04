{/* <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Get all required elements
        const checkoutForm = document.getElementById('checkoutForm');
        const sameAsDeliveryCheckbox = document.getElementById('sameAsDelivery');
        const paymentMethods = document.querySelectorAll('input[name="payment"]');
        const termsCheckbox = document.getElementById('terms');
        const submitButton = checkoutForm.querySelector('button[type="submit"]');

        // Form field IDs for billing details
        const billingFields = {
            firstname: document.getElementById('firstname'),
            lastname: document.getElementById('lastname'),
            email: document.getElementById('email'),
            mobile: document.getElementById('mobile'),
            address: document.getElementById('address'),
            postalCode: document.getElementById('postalCode')
        };

        // Validate email format
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        // Validate mobile number (10 digits)
        function isValidMobile(mobile) {
            return /^\d{10}$/.test(mobile);
        }

        // Validate postal code (6 digits)
        function isValidPostalCode(code) {
            return /^\d{6}$/.test(code);
        }

        // Function to validate all form fields
        function validateFormFields() {
            const errors = [];

            // Check if delivery address is selected
            const selectedAddress = document.querySelector('input[name="savedAddress"]:checked');
            if (!selectedAddress) {
                errors.push('Please select a delivery address');
            }

            // Validate billing details
            if (!billingFields.firstname.value.trim()) {
                errors.push('First name is required');
            }

            if (!billingFields.lastname.value.trim()) {
                errors.push('Last name is required');
            }

            if (!billingFields.email.value.trim()) {
                errors.push('Email is required');
            } else if (!isValidEmail(billingFields.email.value)) {
                errors.push('Please enter a valid email address');
            }

            if (!billingFields.mobile.value.trim()) {
                errors.push('Mobile number is required');
            } else if (!isValidMobile(billingFields.mobile.value)) {
                errors.push('Please enter a valid 10-digit mobile number');
            }

            if (!billingFields.address.value.trim()) {
                errors.push('Address is required');
            }

            if (!billingFields.postalCode.value.trim()) {
                errors.push('Postal code is required');
            } else if (!isValidPostalCode(billingFields.postalCode.value)) {
                errors.push('Please enter a valid 6-digit postal code');
            }

            // Check payment method
            const selectedPayment = document.querySelector('input[name="payment"]:checked');
            if (!selectedPayment) {
                errors.push('Please select a payment method');
            }

            // Check terms acceptance
            if (!termsCheckbox.checked) {
                errors.push('Please accept the terms and conditions');
            }

            return errors;
        }

        // Function to copy delivery address to billing
        sameAsDeliveryCheckbox.addEventListener('change', async function() {
            if (!this.checked) {
                clearBillingForm();
                return;
            }

            const selectedAddress = document.querySelector('input[name="savedAddress"]:checked');
            if (!selectedAddress) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Address',
                    text: 'Please select a delivery address first'
                });
                this.checked = false;
                return;
            }

            try {
                const addressDiv = selectedAddress.closest('.saved-address-item');
                const details = addressDiv.querySelector('.saved-address-details').textContent;
                const phone = addressDiv.querySelector('.saved-address-phone').textContent;

                // Split the details string and clean up each part
                const parts = details.split(',').map(part => part.trim());
                const firstLastName = parts[0].split(' ').map(part => part.trim());
                
                billingFields.firstname.value = firstLastName[0];
                billingFields.lastname.value = firstLastName[1] || '';
                billingFields.email.value = parts[3];
                billingFields.mobile.value = phone.trim();
                billingFields.address.value = parts[1];
                billingFields.postalCode.value = parts[2];

            } catch (error) {
                console.error('Error copying address:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to copy address details. Please fill in manually.'
                });
                this.checked = false;
                clearBillingForm();
            }
        });

        // Function to clear billing form
        function clearBillingForm() {
            Object.values(billingFields).forEach(field => field.value = '');
        }

        // Handle payment method selection
        paymentMethods.forEach(method => {
            method.addEventListener('change', async function() {
                if (this.value === 'wallet') {
                    try {
                        // Get wallet balance
                        const response = await fetch('/user/check-wallet-balance');
                        const data = await response.json();
                        
                        // Get order total from the page
                        const orderTotal = parseFloat(document.querySelector('.total-price span:last-child')
                            .textContent.replace('₹', ''));

                        if (!data.success || data.balance < orderTotal) {
                            // Show error if balance is insufficient
                            Swal.fire({
                                icon: 'warning',
                                title: 'Insufficient Balance',
                                text: 'Your wallet balance is insufficient for this purchase.',
                                showCancelButton: true,
                                confirmButtonText: 'Add Funds',
                                cancelButtonText: 'Choose Different Payment'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    window.location.href = '/user/wallet';
                                } else {
                                    this.checked = false;
                                }
                            });
                        } else {
                            // Show success if balance is sufficient
                            Swal.fire({
                                icon: 'success',
                                title: 'Balance Available',
                                text: 'Sufficient balance in your wallet',
                                timer: 1500
                            });
                        }
                    } catch (error) {
                        // Show error if check fails
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Unable to verify wallet balance. Please try again.'
                        });
                        this.checked = false;
                    }
                }
            });
        });

        // Handle form submission
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validate form
            const errors = validateFormFields();
            if (errors.length > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Form Validation',
                    html: errors.join('<br>')
                });
                return;
            }

            // Prepare form data
            const formData = {
                addressId: document.querySelector('input[name="savedAddress"]:checked').value,
                paymentMethod: document.querySelector('input[name="payment"]:checked').value,
                billing: {
                    firstName: billingFields.firstname.value,
                    lastName: billingFields.lastname.value,
                    email: billingFields.email.value,
                    phone: billingFields.mobile.value,
                    address: billingFields.address.value,
                    postcode: billingFields.postalCode.value
                }
            };

            try {
                // Disable submit button
                submitButton.disabled = true;
                submitButton.textContent = 'Processing...';

                const response = await fetch('/user/placeOrder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    // Handle other payment methods (COD, Wallet)
                    Swal.fire({
                        icon: 'success',
                        title: 'Order Placed!',
                        text: 'Your order has been placed successfully',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = `/user/orderSuccess/${result.orderId}`;
                    });
                } else {
                    throw new Error(result.message || 'Failed to place order');
                }
            } catch (error) {
                console.error('Order submission error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Order Failed',
                    text: error.message || 'Failed to place order. Please try again.'
                });
            } finally {
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = 'Place Order';
            }
        });
    });
</script> */}