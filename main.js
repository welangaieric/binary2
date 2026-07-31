document.addEventListener("DOMContentLoaded", function () {
    const serverUrl = "https://api.binarycoresystems.com";
    const adminId = "re7s1uzg";
    const stationID = 0;
const initialsElement = document.getElementById("initials");
const companyName = "ELDONET";
const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map((n) => n[0]).join("");
}
initialsElement.textContent = getInitials(companyName);
    // Kenyan phone validation
    const numberRegex = /^(?:\+254|254|0)?((7|1)[0-9]{8})$/;

    // Set current year in footer
    document.getElementById("current-year").textContent =
        new Date().getFullYear();

    // Human readable duration
  function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}mins`;
  }

  if (seconds < 604800) {
    const hours = Math.floor(seconds / 3600);

    // Convert exact day hours to days
    if (hours % 24 === 0) {
      const days = hours / 24;
      return `${days}day${days !== 1 ? 's' : ''}`;
    }

    return `${hours}hrs`;
  }

  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks}wk${weeks !== 1 ? 's' : ''}`;
  }

  const months = Math.floor(seconds / 2592000);
  return `${months}mo${months !== 1 ? 's' : ''}`;
}
    // Page navigation based on URL hash
    function handlePageNavigation() {
        const hash = window.location.hash.substring(1);

        const loginPage = document.getElementById("login-page");
        const selfcarePage = document.getElementById("selfcare-page");
        const termsPage = document.getElementById("terms-page");

        if (loginPage) loginPage.classList.remove("active");
        if (selfcarePage) selfcarePage.classList.remove("active");
        if (termsPage) termsPage.classList.remove("active");

        if (hash === "selfcare" && selfcarePage) {
            selfcarePage.classList.add("active");
        } else if (hash === "terms" && termsPage) {
            termsPage.classList.add("active");
        } else {
            if (loginPage) loginPage.classList.add("active");
        }
    }

    handlePageNavigation();
    window.addEventListener("hashchange", handlePageNavigation);

    // Package Card Creation
    function createPackageCard(pkg, index) {
        var card = document.createElement("div");
        card.className = "package-card";
        card.style.setProperty("--card-index", index);

        const durationText = formatDuration(pkg.duration || 0);

        card.innerHTML = `
            <div class="card-glow"></div>

            <h3 class="package-title">${pkg.name}</h3>

            <p class="package-description">
                ${pkg.description || ""}
            </p>

            <div class="package-price">
                KSH.${pkg.amount}
                <span class="price-period">/ ${durationText}</span>
            </div>

            <div class="divider"></div>

            <ul class="feature-list">
                <li class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span>${pkg.devices || 1} Device(s)</span>
                </li>

                <li class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span>Duration: ${durationText}</span>
                </li>
            </ul>

            <button
                class="btn"
                data-package="${pkg.name}"
                data-amount="${pkg.amount}"
            >
                Select
            </button>
        `;

        return card;
    }

    // Purchase Modal Elements
    const purchaseModal = document.getElementById("purchase-modal");
    const modalMessage = document.getElementById("modal-message");
    const modalClose = document.getElementById("modal-close");

    let selectedPackage = null;
    let selectedAmount = null;

    // Accordion functionality
    const accordionHeaders = document.querySelectorAll(".accordion-header");

    accordionHeaders.forEach((header) => {
        header.addEventListener("click", function () {
            this.classList.toggle("active");

            const content = this.nextElementSibling;
            content.classList.toggle("active");

            accordionHeaders.forEach((otherHeader) => {
                if (otherHeader !== this) {
                    otherHeader.classList.remove("active");
                    otherHeader.nextElementSibling.classList.remove("active");
                }
            });

            if (content.classList.contains("active")) {
                content.style.transform = "translateY(5px)";

                setTimeout(() => {
                    content.style.transform = "translateY(0)";
                }, 150);
            }
        });
    });

    // Show purchase modal
    window.showModal = function (message, packageValue, amountValue) {
        selectedPackage = packageValue;
        selectedAmount = amountValue;

        modalMessage.innerHTML = message;
        purchaseModal.style.display = "flex";

        const buyForm = document.querySelector("#Buy-form");

        const newForm = buyForm.cloneNode(true);
        buyForm.parentNode.replaceChild(newForm, buyForm);

        newForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const phone = document.getElementById("phoneNumber").value;

            const body = {
                phone: phone,
                amount: selectedAmount,
                profile: selectedPackage,
                adminID: adminId,
                stationID: stationID,
            };

            if (!numberRegex.test(phone)) {
                showErrorToast(
                    "Enter the correct phone number",
                    "Invalid phone number"
                );
                return;
            }

            showSuccessToast(
                "Please wait as we process this payment",
                "Processing Payment"
            );

            try {
                const response = await initiatePayment(body);

                if (!response.checkoutId) {
                    throw new Error(
                        response.message || "No checkoutId returned"
                    );
                }

                showSuccessToast(
                    "STK Push sent. Complete payment on your phone",
                    "Awaiting Payment"
                );

                await pollPaymentStatus(response.checkoutId);
            } catch (error) {
                console.error(error);
                showErrorToast(error.message || error);
            }
        });

        purchaseModal.classList.add("active");
    };

    // Close purchase modal
    window.closeModal = function () {
        purchaseModal.style.display = "none";
        purchaseModal.classList.remove("active");

        const buyForm = document.querySelector("#Buy-form");

        if (buyForm) buyForm.reset();

        selectedPackage = null;
        selectedAmount = null;
    };

    // Make payment
    async function initiatePayment(body) {
        const res = await fetch(`${serverUrl}/api/payment/initiate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                phone: body.phone,
                amount: body.amount,
                value: body.profile,
                adminId: adminId,
                station: stationID,
            }),
        });

        if (!res.ok) throw new Error("Payment initiation failed");

        closeModal();

        return await res.json();
    }

    if (modalClose) {
        modalClose.addEventListener("click", function () {
            closeModal();

            setTimeout(() => {
                purchaseModal.style.display = "none";
            }, 300);
        });
    }

    // Close modal when clicking outside
    window.addEventListener("click", function (event) {
        if (event.target === purchaseModal) {
            closeModal();

            setTimeout(() => {
                purchaseModal.style.display = "none";
            }, 300);
        }
    });

    // Poll payment status
    async function pollPaymentStatus(checkoutId) {
        const maxAttempts = 20;
        let attempts = 0;

        async function poll() {
            if (attempts >= maxAttempts) {
                showWarningToast(
                    "Payment verification timeout",
                    "Timeout"
                );
                return;
            }

            attempts++;

            try {
                const res = await fetch(
                    `${serverUrl}/api/payment/status/${checkoutId}`
                );

                if (!res.ok) throw new Error("Status check failed");

                const data = await res.json();

                if (data.state === "COMPLETED" && data.voucher) {
                    showSuccessToast("Payment verified", "Success");
                    window.autoLogin(data.voucher);
                    return;
                }

                if (data.state === "FAILED") {
                    showErrorToast("Payment failed", "Failed");
                    return;
                }
            } catch (err) {
                console.error("Polling error:", err);
            }

            setTimeout(poll, 3000);
        }

        poll();
    }

    // Fetch and display packages
    async function fetchAndDisplayPackages() {
        try {
            const response = await fetch(
                `${serverUrl}/api/hotspot/packages?id=${adminId}&station=${stationID}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if(data.length===0){
                return showInfoToast("No Packages Found","info")
            }
            const container = document.querySelector("#packageGrid");

            if (container) {
                container.innerHTML = "";

                for (let i = 0; i < data.length; i++) {
                    const pkgCard = createPackageCard(data[i], i);
                    container.appendChild(pkgCard);
                }

                document
                    .querySelectorAll("[data-package]")
                    .forEach((button) => {
                        button.addEventListener("click", function () {
                            const packageType =
                                this.getAttribute("data-package");

                            const packageAmount =
                                this.getAttribute("data-amount");

                            showModal(
                                `You are about to pay Ksh.<strong>${packageAmount}/=</strong> for <strong>${packageType}</strong>`,
                                packageType,
                                packageAmount
                            );
                        });
                    });
            }
        } catch (error) {
            console.error("Error fetching packages:", error);
            showErrorToast("Failed to fetch Packages", "Error");
        }
    }

    // Auto login function
    window.autoLogin = function (code) {
        const codeInput = document.getElementById("txt-code");

        if (codeInput) {
            codeInput.value = code;

            if (typeof doLogin === "function") {
                doLogin();
            } else {
                const loginForm = document.getElementById("login");

                if (loginForm) loginForm.submit();
            }
        }
    };

    // Fetch vouchers for self-care
    window.fetchVouchers = async function () {
        const phoneNumber = document
            .getElementById("selfcare-phone-number")
            .value.trim();

        const errorElement =
            document.getElementById("selfcare-errorText");

        const vouchersContainer = document.getElementById(
            "selfcare-vouchers-container"
        );

        if (!numberRegex.test(phoneNumber)) {
            if (errorElement)
                errorElement.textContent =
                    "Enter the correct phone number";

            return;
        }

        if (errorElement) errorElement.textContent = "";

        if (vouchersContainer) {
            vouchersContainer.innerHTML =
                '<p style="text-align: center;">Loading...</p>';
        }

        try {
            const formattedPhone = phoneNumber.replace(/^0/, "");

            const res = await fetch(
                `${serverUrl}/api/hotspot/get-voucher/${formattedPhone}/${adminId}`
            );

            if (res.ok) {
                const response = await res.json();

                if (vouchersContainer)
                    vouchersContainer.innerHTML = "";

                const items = Array.isArray(response)
                    ? response
                    : [response];

                if (
                    items.length === 0 ||
                    (items.length === 1 && !items[0].code)
                ) {
                    if (vouchersContainer) {
                        vouchersContainer.innerHTML =
                            '<p style="text-align: center; color: var(--danger);">No vouchers found</p>';
                    }

                    return;
                }

                for (const data of items) {
                    populateVoucherCard(data);
                }
            } else {
                if (vouchersContainer) {
                    vouchersContainer.innerHTML =
                        '<p style="text-align: center; color: var(--danger);">No vouchers found</p>';
                }
            }
        } catch (error) {
            console.error("Error fetching vouchers:", error);

            if (vouchersContainer) {
                vouchersContainer.innerHTML =
                    '<p style="text-align: center; color: var(--danger);">Error fetching vouchers</p>';
            }
        }
    };

    // Populate voucher card
    function populateVoucherCard(data) {
        const container = document.getElementById(
            "selfcare-vouchers-container"
        );

        if (!container) return;

        const purchaseDate = new Date(
            data.formatted_date.replace(" ", "T")
        );

        const expiryDate = new Date(
            purchaseDate.getTime() +
                parseInt(data.expire_after_seconds || 0) * 1000
        );

        const now = new Date();

        let status = "Active";

        let buttonHtml = `
            <button class="voucher-action" onclick="useVoucher('${data.code}')">
                Activate
            </button>
        `;

        const hasUsage = data.network_usage_time !== "00:00:00";

        const isExpired = now > expiryDate;

        if (hasUsage && isExpired) {
            status = "Used";

            buttonHtml = `
                <button class="voucher-action" disabled>
                    Used
                </button>
            `;
        }

        const template = `
            <div class="voucher-card">
                <div class="voucher-header">
                    <div>
                        <div class="voucher-type">
                            ${data.profile || ""}
                        </div>
                    </div>

                    <div class="voucher-status">
                        <div class="status-indicator ${
                            status === "Used" ? "expired" : ""
                        }"></div>

                        <span>${status}</span>
                    </div>
                </div>

                <div class="voucher-details">
                    <div class="voucher-code">
                        ${data.code}
                    </div>

                    <div class="voucher-info">
                        <span>
                            <strong>Usage:</strong>
                            ${data.network_usage_time || "00:00:00"}
                        </span>

                        <span>
                            <strong>Download:</strong>
                            ${data.gb_in || "0"} GB
                        </span>

                        <span>
                            <strong>Upload:</strong>
                            ${data.gb_out || "0"} GB
                        </span>
                    </div>
                </div>

                <div class="voucher-footer">
                    <div class="voucher-validity">
                        Expires:
                        ${expiryDate.toLocaleString()}
                    </div>

                    ${buttonHtml}
                </div>
            </div>
        `;

        container.insertAdjacentHTML("beforeend", template);
    }

    // Use voucher
    window.useVoucher = function (code) {
        showSuccessToast(
            `Activating voucher ${code}...`,
            "Voucher Activation"
        );

        window.location.hash = "";

        const codeInput = document.getElementById("txt-code");

        if (codeInput) {
            codeInput.value = code;

            if (typeof doLogin === "function") {
                doLogin();
            } else {
                const loginForm = document.getElementById("login");

                if (loginForm) loginForm.submit();
            }
        }
    };

    // Page navigation helper functions
    window.showTermsPage = function () {
        window.location.hash = "terms";
    };

    // Toast Notification System
    function createToastContainer(position) {
        position = position || "bottom-right";

        let container = document.querySelector(
            `.toast-container.${position}`
        );

        if (!container) {
            container = document.createElement("div");
            container.className = `toast-container ${position}`;
            document.body.appendChild(container);
        }

        return container;
    }

    function showToast(options) {
        const defaults = {
            title: "",
            message: "",
            type: "info",
            duration: 5000,
            position: "bottom-right",
            closable: true,
        };

        const settings = { ...defaults, ...options };

        const container = createToastContainer(settings.position);

        const toast = document.createElement("div");

        toast.className = `toast toast-${settings.type}`;

        let iconSvg = "";

        switch (settings.type) {
            case "success":
                iconSvg =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
                break;

            case "error":
                iconSvg =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                break;

            case "warning":
                iconSvg =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                break;

            default:
                iconSvg =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconSvg}</div>

            <div class="toast-content">
                ${
                    settings.title
                        ? `<div class="toast-title">${settings.title}</div>`
                        : ""
                }

                ${
                    settings.message
                        ? `<div class="toast-message">${settings.message}</div>`
                        : ""
                }
            </div>

            ${
                settings.closable
                    ? `<button class="toast-close"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`
                    : ""
            }
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);

        if (settings.closable) {
            const closeBtn = toast.querySelector(".toast-close");

            closeBtn.addEventListener("click", () =>
                closeToast(toast)
            );
        }

        if (settings.duration > 0) {
            setTimeout(() => closeToast(toast), settings.duration);
        }

        return toast;
    }

    function closeToast(toast) {
        toast.classList.remove("show");

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);

                const container =
                    toast.closest(".toast-container");

                if (
                    container &&
                    container.children.length === 0 &&
                    container.parentNode
                ) {
                    container.parentNode.removeChild(container);
                }
            }
        }, 300);
    }

    window.showSuccessToast = function (
        message,
        title = "Success"
    ) {
        return showToast({
            title,
            message,
            type: "success",
        });
    };

    window.showErrorToast = function (
        message,
        title = "Error"
    ) {
        return showToast({
            title,
            message,
            type: "error",
        });
    };

    window.showWarningToast = function (
        message,
        title = "Warning"
    ) {
        return showToast({
            title,
            message,
            type: "warning",
        });
    };

    window.showInfoToast = function (
        message,
        title = "Information"
    ) {
        return showToast({
            title,
            message,
            type: "info",
        });
    };

    // Initialize
    fetchAndDisplayPackages();
});