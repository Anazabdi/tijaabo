/**
 * EVC Plus & eDahab Payment QR & PDF Generator
 * 
 * Handles user inputs, validates Somali mobile phone numbers,
 * formats and constructs payment payloads, generates QR codes using QRCode.js,
 * exports print-optimized PDF posters using jsPDF, and hosts the Donor Payment Portal.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements Selector ---
    const qrForm = document.getElementById("qrForm");
    const mobileInput = document.getElementById("mobileNumber");
    const amountInput = document.getElementById("amount");
    const qrFormatInputs = document.getElementsByName("qrFormat");
    const hostedDomainInput = document.getElementById("hostedDomain");
    const hostedDomainGroup = document.getElementById("hostedDomainGroup");
    
    const labelFormatWeb = document.getElementById("labelFormatWeb");
    const labelFormatUssd = document.getElementById("labelFormatUssd");
    const labelFormatEdahab = document.getElementById("labelFormatEdahab");
    
    const webPlaceholderText = document.getElementById("webPlaceholderText");
    const ussdPlaceholderText = document.getElementById("ussdPlaceholderText");
    const edahabPlaceholderText = document.getElementById("edahabPlaceholderText");
    const generateBtn = document.getElementById("generateBtn");
    
    // Preview Card Elements
    const previewMobile = document.getElementById("previewMobile");
    const previewAmount = document.getElementById("previewAmount");
    const qrcodeContainer = document.getElementById("qrcode");
    const instructionsText = document.getElementById("instructionsText");
    
    // Post-generation Actions
    const controlActions = document.getElementById("controlActions");
    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    const printBtn = document.getElementById("printBtn");

    // Global variable to hold active QRCode instance
    let qrInstance = null;

    // --- Local File Protocol Helper ---
    if (window.location.protocol === "file:" && hostedDomainGroup) {
        hostedDomainGroup.style.display = "block";
    }

    // --- Dynamic Check for Donor Mode Routing ---
    const urlParams = new URLSearchParams(window.location.search);
    const recipientParam = urlParams.get('r');
    const amountParam = urlParams.get('a');

    if (recipientParam) {
        // Activate Donor Scan Mode
        document.body.classList.add("donor-active");
        
        const donorRecipientPhone = document.getElementById("donorRecipientPhone");
        const donorAmountInput = document.getElementById("donorAmount");
        const donorInstructionsText = document.getElementById("donorInstructions");
        const quickAmountButtons = document.querySelectorAll(".quick-amounts .btn-amount");
        
        // Clean and display recipient
        const normRecipient = normalizeMobileNumber(recipientParam) || recipientParam;
        donorRecipientPhone.textContent = formatPhoneForDisplay(normRecipient);
        
        // Set initial amount
        let initialAmount = parseFloat(amountParam);
        if (isNaN(initialAmount) || initialAmount <= 0) {
            initialAmount = 1.00;
        }
        donorAmountInput.value = initialAmount.toFixed(2);
        
        // Update quick amounts buttons styling
        function updateQuickAmountActive(amt) {
            quickAmountButtons.forEach(btn => {
                if (parseFloat(btn.dataset.val) === parseFloat(amt)) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
        }
        
        updateQuickAmountActive(initialAmount);
        
        // Quick Amount Listeners
        quickAmountButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const val = parseFloat(btn.dataset.val);
                donorAmountInput.value = val.toFixed(2);
                updateQuickAmountActive(val);
                updateDonorInstructions();
            });
        });
        
        donorAmountInput.addEventListener("input", () => {
            const val = parseFloat(donorAmountInput.value) || 0;
            updateQuickAmountActive(val);
            updateDonorInstructions();
        });
        
        // Donor Provider Choice Listeners
        const donorProviders = document.getElementsByName("donorProvider");
        const labelDonorEvc = document.getElementById("labelDonorEvc");
        const labelDonorEdahab = document.getElementById("labelDonorEdahab");
        
        donorProviders.forEach(input => {
            input.addEventListener("change", (e) => {
                labelDonorEvc.classList.remove("active");
                labelDonorEdahab.classList.remove("active");
                
                if (e.target.value === "evc") {
                    labelDonorEvc.classList.add("active");
                } else {
                    labelDonorEdahab.classList.add("active");
                }
                updateDonorInstructions();
            });
        });
        
        function getSelectedDonorProvider() {
            let provider = "evc";
            donorProviders.forEach(input => {
                if (input.checked) provider = input.value;
            });
            return provider;
        }
        
        function updateDonorInstructions() {
            const provider = getSelectedDonorProvider();
            const amt = parseFloat(donorAmountInput.value) || 0;
            const cleanPhone = normalizeMobileNumber(recipientParam) || recipientParam;
            
            if (provider === "evc") {
                donorInstructionsText.innerHTML = `<i class="fa-solid fa-circle-info"></i> Prefilling EVC Plus USSD code <strong>*712*${cleanPhone}*${amt.toFixed(2)}#</strong>. Press Call/Send to open the secure Hormuud PIN prompt.`;
            } else {
                donorInstructionsText.innerHTML = `<i class="fa-solid fa-circle-info"></i> Prefilling eDahab USSD code <strong>*110*${cleanPhone}*${amt.toFixed(2)}#</strong>. Press Call/Send to open the secure Somtel PIN prompt.`;
            }
        }
        
        updateDonorInstructions();
        
        // Donor Payment Submit
        const donorForm = document.getElementById("donorForm");
        donorForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const provider = getSelectedDonorProvider();
            const amt = parseFloat(donorAmountInput.value);
            const cleanPhone = normalizeMobileNumber(recipientParam) || recipientParam;
            
            if (isNaN(amt) || amt <= 0) {
                alert("Please enter a valid amount greater than $0.00.");
                return;
            }
            
            let ussdUri = "";
            if (provider === "evc") {
                ussdUri = `tel:*712*${cleanPhone}*${amt.toFixed(2)}%23`;
            } else {
                ussdUri = `tel:*110*${cleanPhone}*${amt.toFixed(2)}%23`;
            }
            
            // Redirect browser to trigger phone dialer with prefilled code
            window.location.href = ussdUri;
        });
        
        // Return to Generator
        document.getElementById("btnBackToGenerator").addEventListener("click", () => {
            window.location.href = window.location.pathname;
        });
    }

    // --- Generator Format Toggle Logic ---
    qrFormatInputs.forEach(input => {
        input.addEventListener("change", (e) => {
            labelFormatWeb.classList.remove("active");
            labelFormatUssd.classList.remove("active");
            labelFormatEdahab.classList.remove("active");
            
            if (e.target.value === "web") {
                labelFormatWeb.classList.add("active");
            } else if (e.target.value === "ussd") {
                labelFormatUssd.classList.add("active");
            } else if (e.target.value === "edahab") {
                labelFormatEdahab.classList.add("active");
            }
            
            updatePayloadDescriptor();
        });
    });

    mobileInput.addEventListener("input", updatePayloadDescriptor);
    amountInput.addEventListener("input", updatePayloadDescriptor);
    if (hostedDomainInput) {
        hostedDomainInput.addEventListener("input", updatePayloadDescriptor);
    }

    /**
     * Updates the preview payload string in the radio configuration descriptions.
     */
    function updatePayloadDescriptor() {
        const rawMobile = mobileInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0.25;
        const normalized = normalizeMobileNumber(rawMobile);
        const format = getSelectedFormat();

        if (normalized) {
            const payload = generatePaymentPayload(normalized, amount, format);
            if (format === "web") {
                webPlaceholderText.textContent = payload;
            } else if (format === "ussd") {
                ussdPlaceholderText.textContent = payload;
            } else {
                edahabPlaceholderText.textContent = payload;
            }
        } else {
            if (format === "web") {
                webPlaceholderText.textContent = "Scan to choose EVC/eDahab & amount on phone";
            } else if (format === "ussd") {
                ussdPlaceholderText.textContent = "*712*number*amount#";
            } else {
                edahabPlaceholderText.textContent = "*110*number*amount#";
            }
        }
    }

    // --- Phone Number Helper Functions ---
    
    /**
     * Cleans and normalizes Somalia mobile numbers (Hormuud & Somtel)
     */
    function normalizeMobileNumber(phone) {
        let cleaned = phone.replace(/\D/g, "");

        if (cleaned.startsWith("252") && cleaned.length > 9) {
            cleaned = cleaned.substring(3);
        }

        if (cleaned.startsWith("0") && cleaned.length >= 10) {
            cleaned = cleaned.substring(1);
        }

        // Somalia valid prefixes:
        // 61, 77, 85, 90: Hormuud (EVC Plus)
        // 62, 68, 77, 90: Somtel (eDahab)
        const validPrefixPattern = /^(61|62|68|77|85|90)\d{7}$/;
        if (validPrefixPattern.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    function formatPhoneForDisplay(phone) {
        if (!phone || phone.length < 9) return phone;
        return `+252 ${phone.substring(0, 2)} ${phone.substring(2, 5)} ${phone.substring(5)}`;
    }

    function getSelectedFormat() {
        let value = "web";
        qrFormatInputs.forEach(input => {
            if (input.checked) {
                value = input.value;
            }
        });
        return value;
    }

    // --- Payment Payload Construction Logic ---
    function generatePaymentPayload(mobile, amount, format, forScanning = false) {
        const formattedAmount = amount.toFixed(2);
        
        if (format === "web") {
            // Encode the dynamic donor URL pointing back to this portal
            let baseUrl = `${window.location.origin}${window.location.pathname}`;
            if (window.location.protocol === "file:") {
                if (hostedDomainInput && hostedDomainInput.value.trim()) {
                    baseUrl = hostedDomainInput.value.trim();
                } else {
                    baseUrl = "https://evc-plus-qr-donation.local"; // fallback indicator
                }
            }
            return `${baseUrl}?r=${mobile}&a=${formattedAmount}`;
        } else if (format === "ussd") {
            if (forScanning) {
                // For raw QR scanning, literal '#' is highly recommended over '%23'
                return `tel:*712*${mobile}*${formattedAmount}#`;
            }
            return `*712*${mobile}*${formattedAmount}#`;
        } else if (format === "edahab") {
            if (forScanning) {
                // For raw QR scanning, literal '#' is highly recommended over '%23'
                return `tel:*110*${mobile}*${formattedAmount}#`;
            }
            return `*110*${mobile}*${formattedAmount}#`;
        }
        return "";
    }

    // --- Form Submissions and QR Generation ---
    qrForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const rawMobile = mobileInput.value.trim();
        const amount = parseFloat(amountInput.value);
        let isValid = true;

        // Reset errors
        mobileInput.parentElement.classList.remove("error");
        document.getElementById("mobileError").style.display = "none";
        amountInput.parentElement.classList.remove("error");
        document.getElementById("amountError").style.display = "none";

        const normalizedMobile = normalizeMobileNumber(rawMobile);
        if (!normalizedMobile) {
            mobileInput.parentElement.classList.add("error");
            document.getElementById("mobileError").style.display = "block";
            isValid = false;
        }

        if (isNaN(amount) || amount <= 0) {
            amountInput.parentElement.classList.add("error");
            document.getElementById("amountError").style.display = "block";
            isValid = false;
        }

        if (!isValid) return;

        // 2. Update Poster Card UI Preview
        previewMobile.textContent = formatPhoneForDisplay(normalizedMobile);
        previewAmount.textContent = `$${amount.toFixed(2)}`;

        const format = getSelectedFormat();
        const humanPayload = generatePaymentPayload(normalizedMobile, amount, format, false);
        const qrPayload = generatePaymentPayload(normalizedMobile, amount, format, true);

        // Update poster help instructions text based on format
        const titleEl = document.getElementById("posterHeaderTitle");
        const taglineEl = document.getElementById("posterTagline");
        
        if (format === "web") {
            titleEl.textContent = "SOMALIA MOBILE PAYMENTS";
            taglineEl.textContent = "EVC Plus / eDahab Portal";
            instructionsText.textContent = `Scan this QR with your phone camera to select payment provider (EVC Plus or eDahab) and custom amount.`;
        } else if (format === "ussd") {
            titleEl.textContent = "EVC PLUS PAYMENTS";
            taglineEl.textContent = "Scan and Support";
            instructionsText.textContent = `Scan this QR with your phone's camera to open your dialer prefilled with ${humanPayload}, then press Call to open your EVC Plus payment menu.`;
        } else {
            titleEl.textContent = "EDAHAB PAYMENTS";
            taglineEl.textContent = "Scan and Support";
            instructionsText.textContent = `Scan this QR with your phone's camera to open your dialer prefilled with ${humanPayload}, then press Call to open your eDahab payment menu.`;
        }

        // 3. Render QR Code
        qrcodeContainer.innerHTML = "";
        qrInstance = new QRCode(qrcodeContainer, {
            text: qrPayload,
            width: 200,
            height: 200,
            colorDark: "#0F172A",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H
        });

        // 4. Enable Buttons
        controlActions.classList.remove("disabled");
        downloadPdfBtn.removeAttribute("disabled");
        printBtn.removeAttribute("disabled");

        // 5. Automatic PDF Download
        setTimeout(() => {
            downloadPDF(normalizedMobile, amount, qrPayload, humanPayload);
        }, 300);
    });

    // --- Action Listeners ---
    downloadPdfBtn.addEventListener("click", () => {
        const rawMobile = mobileInput.value.trim();
        const normalizedMobile = normalizeMobileNumber(rawMobile);
        const amount = parseFloat(amountInput.value);
        const format = getSelectedFormat();
        
        if (normalizedMobile && !isNaN(amount)) {
            const humanPayload = generatePaymentPayload(normalizedMobile, amount, format, false);
            const qrPayload = generatePaymentPayload(normalizedMobile, amount, format, true);
            downloadPDF(normalizedMobile, amount, qrPayload, humanPayload);
        }
    });

    printBtn.addEventListener("click", () => {
        window.print();
    });

    // --- PDF Document Construction via jsPDF (Landscape: 550 x 300 Points) ---
    function downloadPDF(mobile, amount, qrPayload, humanPayload) {
        const canvas = qrcodeContainer.querySelector("canvas");
        const img = qrcodeContainer.querySelector("img");
        let qrImgData = "";

        if (canvas && canvas.getContext) {
            qrImgData = canvas.toDataURL("image/png");
        } else if (img && img.src) {
            qrImgData = img.src;
        }

        if (!qrImgData) {
            alert("Error: QR Code image could not be loaded for PDF generation.");
            return;
        }

        // Initialize jsPDF at 550 pt width x 300 pt height (Landscape)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "pt",
            format: [550, 300]
        });

        // 1. Draw Page Background Decoration (Clean border/frame)
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(2);
        doc.rect(12, 12, 526, 276); // External boundary

        // 2. Draw Top Primary Header Banner (Hormuud Gold theme)
        doc.setFillColor(245, 166, 35); // Hormuud Gold
        doc.rect(12, 12, 526, 10, "F");

        // 3. Header Titles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("SOMALIA MOBILE PAYMENT", 30, 48);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text("SCAN AND SUPPORT SECURELY", 30, 62);

        // Horizontal Separator Line
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(1);
        doc.line(30, 75, 310, 75);

        // 4. Draw Recipient Information Card
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(226, 232, 240);
        doc.rect(30, 90, 280, 80, "FD");

        // Recipient Phone Number Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("RECIPIENT NUMBER", 45, 112);

        const formattedMobile = formatPhoneForDisplay(mobile);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(formattedMobile, 45, 128);

        // Donation Amount Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("SUGGESTED AMOUNT (USD)", 45, 150);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129); // Success Green
        doc.text(`$${amount.toFixed(2)}`, 45, 164);

        // 5. Instructions
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate 500
        
        const selectedFormat = getSelectedFormat();
        let instructions = "";
        if (selectedFormat === "web") {
            instructions = "Scan this QR code with your phone camera to select payment provider (EVC Plus / eDahab) and customize your donation amount directly.";
        } else if (selectedFormat === "ussd") {
            instructions = `Scan this QR with your phone's camera to prefill the USSD code ${humanPayload} in your dialer, then press Call/Send.`;
        } else {
            instructions = `Scan this QR with your phone's camera to prefill the USSD code ${humanPayload} in your dialer, then press Call/Send.`;
        }
        
        const splitInstructions = doc.splitTextToSize(instructions, 280);
        doc.text(splitInstructions, 30, 190);

        // Show targets / details in PDF footer
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        if (selectedFormat === "web") {
            doc.text("Target: Dynamic Web Donation Portal", 30, 245);
        } else {
            doc.text(`USSD Command: ${humanPayload}`, 30, 245);
        }

        // 6. QR Code Section (Right column)
        doc.setDrawColor(148, 163, 184); // Slate 400
        doc.setLineDashPattern([3, 3], 0);
        doc.rect(340, 35, 180, 180);
        doc.setLineDashPattern([], 0); // Reset

        // Render QR Image
        doc.addImage(qrImgData, "PNG", 350, 45, 160, 160);

        // 7. Action Badge: "SCAN TO PAY"
        doc.setFillColor(15, 23, 42); // Dark slate
        doc.rect(340, 225, 180, 22, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255); // White text
        doc.text("SCAN TO DONATE / PAY", 430, 239, { align: "center" });

        // Footer subtext
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("100% Secure Client-Side Payment Gateway", 430, 260, { align: "center" });

        // Save PDF with a descriptive name
        doc.save(`Somalia_Donation_QR_${mobile}.pdf`);
    }

    // --- Privacy-Safe Visitor Counter Integration ---
    function initVisitorCounter() {
        const visitCountEl = document.getElementById("visitCount");
        if (!visitCountEl) return;

        const counterKey = "somalia-evc-donation-visitor-counter-unique-2026";
        const apiUrl = `https://countapi.mileshilliard.com/api/v1/hit/${counterKey}`;
        
        fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error("Visitor counter API error");
                return res.json();
            })
            .then(data => {
                if (data && typeof data.value !== "undefined") {
                    visitCountEl.textContent = Number(data.value).toLocaleString();
                } else {
                    visitCountEl.textContent = "1";
                }
            })
            .catch(err => {
                console.error("Visitor counter could not load:", err);
                visitCountEl.textContent = "1";
            });
    }
    
    initVisitorCounter();
});
