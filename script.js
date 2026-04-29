(function () {
  const recaptchaSiteKey = window.__RECAPTCHA_SITE_KEY__ || "";
  const crmEndpoint = "https://3092a01d-31a6-46a0-a092-11aa63948adc.neodove.com/integration/custom/7998e1da-c784-42b5-8967-02aa22f0447d/leads";
  const modal = document.getElementById("leadModal");
  const leadSource = document.getElementById("leadSource");
  const toast = document.getElementById("toast");
  const openButtons = document.querySelectorAll(".js-open-lead");
  const closeButtons = document.querySelectorAll("[data-close-modal]");
  const forms = document.querySelectorAll(".lead-form");
  const phonePattern = /^[6-9]\d{9}$/;
  let scrollPopupShown = false;
  let exitPopupShown = false;
  let recaptchaWidgetIds = [];

  function openModal(source) {
    if (!modal) return;
    leadSource.value = source || "Lead Popup";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const firstInput = modal.querySelector("input[name='name']");
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3400);
  }

  function setFormStatus(form, message, isError) {
    const status = form.querySelector(".form-status");
    if (!status) return;
    status.textContent = message;
    status.classList.add("is-visible");
    status.classList.toggle("is-error", !!isError);
  }

  function validateForm(form) {
    let valid = true;
    const name = form.querySelector("input[name='name']");
    const phone = form.querySelector("input[name='phone']");
    const email = form.querySelector("input[name='email']");
    const declaration = form.querySelector("input[name='declaration']");
    const declarationWrap = form.querySelector(".declaration");
    const nameError = name && name.parentElement ? name.parentElement.querySelector(".field-error") : null;
    const phoneError = phone && phone.parentElement ? phone.parentElement.querySelector(".field-error") : null;
    const emailError = email && email.parentElement ? email.parentElement.querySelector(".field-error") : null;
    let firstInvalid = null;

    [name, phone, email].forEach(function (input) {
      if (input) input.classList.remove("invalid");
    });
    if (declarationWrap) declarationWrap.classList.remove("invalid");
    [nameError, phoneError, emailError].forEach(function (errorEl) {
      if (errorEl) errorEl.classList.remove("is-visible");
    });

    if (!name.value.trim() || name.value.trim().length < 2) {
      name.classList.add("invalid");
      if (nameError) nameError.classList.add("is-visible");
      firstInvalid = firstInvalid || name;
      valid = false;
    }

    if (!phonePattern.test(phone.value.trim())) {
      phone.classList.add("invalid");
      if (phoneError) phoneError.classList.add("is-visible");
      firstInvalid = firstInvalid || phone;
      valid = false;
    }

    if (!email.checkValidity()) {
      email.classList.add("invalid");
      if (emailError) emailError.classList.add("is-visible");
      firstInvalid = firstInvalid || email;
      valid = false;
    }

    if (declaration && !declaration.checked) {
      if (declarationWrap) declarationWrap.classList.add("invalid");
      firstInvalid = firstInvalid || declaration;
      valid = false;
    }

    if (firstInvalid && typeof firstInvalid.focus === "function") {
      firstInvalid.focus();
    }

    return valid;
  }

  async function sendLeadToCrm(lead) {
    const payload = {
      name: lead.name,
      mobile: Number(lead.phone),
      email: lead.email,
      detail1: lead.source || "GLA Online MBA Landing Page",
      detail2: "GLA Online MBA Landing Page"
    };

    const response = await fetch(crmEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("CRM request failed");
    }

    return response;
  }

  function mountRecaptcha() {
    const slots = document.querySelectorAll("[data-recaptcha-slot]");
    if (!recaptchaSiteKey || !window.grecaptcha || typeof window.grecaptcha.render !== "function") {
      slots.forEach(function (slot) {
        slot.closest(".captcha-wrap").style.display = "none";
      });
      return;
    }

    slots.forEach(function (slot) {
      const wrapper = slot.closest(".captcha-wrap");
      if (!wrapper) return;
      wrapper.style.display = "block";
      const widgetId = window.grecaptcha.render(slot, {
        sitekey: recaptchaSiteKey
      });
      recaptchaWidgetIds.push(widgetId);
    });
  }

  openButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      openModal(button.dataset.source || button.textContent.trim());
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  forms.forEach(function (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validateForm(form)) {
        setFormStatus(form, "Please fill all fields and tick the declaration box.", true);
        showToast("Please fill all fields and tick the declaration box.");
        return;
      }

      const sourceInput = form.querySelector("input[name='source']");
      const source = sourceInput ? sourceInput.value : form.dataset.form;
      const nameInput = form.querySelector("input[name='name']");
      const phoneInput = form.querySelector("input[name='phone']");
      const emailInput = form.querySelector("input[name='email']");
      const lead = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        source: source,
        createdAt: new Date().toISOString()
      };

      const savedLeads = JSON.parse(localStorage.getItem("onlineMbaLeads") || "[]");
      savedLeads.push(lead);
      localStorage.setItem("onlineMbaLeads", JSON.stringify(savedLeads));

      const submitButton = form.querySelector("button[type='submit']");
      const isPopupForm = form.dataset.form === "popup";
      if (submitButton) {
        if (!submitButton.dataset.originalText) {
          submitButton.dataset.originalText = submitButton.textContent;
        }
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      setFormStatus(form, "Thanks to submit this form Our Counsellor will Call you soon", false);
      showToast("Thanks to submit this form Our Counsellor will Call you soon");

      sendLeadToCrm(lead).catch(function (error) {
        const failedLeads = JSON.parse(localStorage.getItem("onlineMbaFailedCrmLeads") || "[]");
        failedLeads.push({ ...lead, error: error.message });
        localStorage.setItem("onlineMbaFailedCrmLeads", JSON.stringify(failedLeads));
      });

      window.setTimeout(function () {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
        }
        form.reset();
      }, 2500);

      if (/Chat with Piyush WhatsApp/i.test(source)) {
        showToast("Thanks. WhatsApp chat is opening after lead verification.");
        window.setTimeout(function () {
          window.location.href = "https://wa.me/919568536853?text=Hi%2C%20I%20want%20to%20know%20Piyush%20Verma%27s%20Microsoft%20placement%20strategy%20for%20GLA%20Online.";
        }, 900);
        return;
      }

      if (/Watch Piyush Journey|Piyush Story Image Click|Talk to Piyush Verma/i.test(source)) {
        showToast("Video unlocked. Our counselor will share Piyush Verma's full journey.");
        return;
      }

      if (/Book Call with Alumni/i.test(source)) {
        showToast("Alumni guidance request received. Our team will confirm your slot shortly.");
        return;
      }

      showToast("Thanks to submit this form Our Counsellor will Call you soon");
    });
  });

  window.addEventListener("scroll", function () {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;

    if (!scrollPopupShown && progress >= 0.5) {
      scrollPopupShown = true;
      openModal("50% Scroll Intent");
    }
  }, { passive: true });

  document.addEventListener("mouseout", function (event) {
    if (event.clientY <= 0 && !exitPopupShown && !modal.classList.contains("is-open")) {
      exitPopupShown = true;
      openModal("Exit Intent");
    }
  });

  function startCountdown() {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    target.setHours(23, 59, 59, 999);

    function update() {
      const remaining = Math.max(target - new Date(), 0);
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      document.getElementById("days").textContent = String(days).padStart(2, "0");
      document.getElementById("hours").textContent = String(hours).padStart(2, "0");
      document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
      document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
    }

    update();
    window.setInterval(update, 1000);
  }

  function revealOnScroll() {
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  startCountdown();
  revealOnScroll();
  window.setTimeout(mountRecaptcha, 0);
})();
