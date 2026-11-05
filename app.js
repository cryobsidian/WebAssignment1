// Shared menu, listing filters, saved-stay buttons, and enquiry form behaviour.
//
// One script is loaded by all three pages (index / stays / enquiry). Each feature
// block first checks that the elements it needs exist and skips itself otherwise,
// so the same file is safe to include on any page.
document.addEventListener('DOMContentLoaded', () => {
  // ── 1. Mobile navigation menu (all pages) ─────────────────────────────────
  // At ≤600px the CSS hides .main-nav and shows the ☰ button. Clicking the button
  // toggles the .open class, which the CSS uses to show the menu as a dropdown.
  // aria-expanded is kept in sync so screen readers announce the menu state.
  // Caveat: the menu does not close on link click, outside click, or Escape.
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open'); // toggle() returns the new state
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  // ── 2. Listing filters and save buttons (stays.html only) ─────────────────
  // Every .stay-card carries its filter data in data-* attributes:
  //   data-type   = "on" | "off"   (on-campus / off-campus)
  //   data-price  = monthly rent in RM, compared against the budget slider
  //   data-search = lowercase keywords, matched against the search box
  // New cards must include all three, otherwise filtering breaks
  // (a missing data-search throws when .includes() is called on undefined).
  const cards = [...document.querySelectorAll('.stay-card')];
  if (cards.length) {
    let type = 'all'; // current type filter, updated by the .filter-chip buttons
    const search = document.querySelector('#stay-search');
    const budget = document.querySelector('#budget-range');
    const budgetLabel = document.querySelector('#budget-label');
    const count = document.querySelector('#result-count');
    const empty = document.querySelector('#empty-state');

    // Shows a card only when it passes all three filters (type AND price AND keyword).
    // Output: toggles each card's `hidden` attribute, updates the "N stays" count,
    // shows the empty state when nothing matches, and formats the slider label
    // as "RM 5,000".
    const applyFilters = () => {
      const query = (search?.value || '').trim().toLowerCase();
      const max = Number(budget?.value || 5000); // Defaults to RM 5,000 if the slider is missing or empty.
      let visible = 0;
      cards.forEach(card => {
        // Plain substring match: an empty query matches everything, but input with
        // punctuation (e.g. "Taylor's") will not match "taylors" in data-search.
        const matches = (type === 'all' || card.dataset.type === type)
          && Number(card.dataset.price) <= max
          && card.dataset.search.includes(query);
        // Relies on the browser's default [hidden] { display: none }. This works
        // because .stay-card does not set its own display value.
        card.hidden = !matches;
        if (matches) visible++;
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? 'stay' : 'stays'}`;
      if (empty) empty.hidden = visible !== 0;
      // 'en-MY' adds a thousands separator: 5000 → "5,000".
      if (budgetLabel) budgetLabel.textContent = `RM ${max.toLocaleString('en-MY')}`;
    };

    // Type filter chips behave like a single-choice group: move the .selected
    // class to the clicked chip, store its data-filter value, then re-filter.
    // Caveat: selection is visual only (no aria-pressed), so screen readers
    // cannot tell which chip is active.
    document.querySelectorAll('.filter-chip').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelector('.filter-chip.selected')?.classList.remove('selected');
        button.classList.add('selected');
        type = button.dataset.filter;
        applyFilters();
      });
    });

    // 'input' fires on every keystroke / slider movement, so results update live.
    search?.addEventListener('input', applyFilters);
    budget?.addEventListener('input', applyFilters);

    // Save buttons toggle between ♡ (not saved) and ♥ (saved) and keep
    // aria-pressed in sync; the CSS styles .save-button[aria-pressed=true].
    // Caveat: saved state lives only in the page and is lost on reload.
    document.querySelectorAll('.save-button').forEach(button => {
      button.addEventListener('click', () => {
        const saved = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(saved));
        button.textContent = saved ? '♥' : '♡';
      });
    });

    // Run once on load so the count and label match the initial control values
    // (the browser may restore a previous search or slider value on Back).
    applyFilters();
  }

  // ── 3. Enquiry form (enquiry.html only) ───────────────────────────────────
  // Front-end demo only: nothing is sent to a server. The <form> has
  // `novalidate`, which turns off the browser's validation bubbles so the
  // custom inline error messages below are used instead.
  const form = document.querySelector('#enquiry-form');
  if (form) {
    // 3a. Pre-select the stay from the URL. Card links on stays.html look like
    //     enquiry.html?stay=U%20Residence. Options are matched case-insensitively
    //     by prefix, so ?stay=Balcony%20Studio selects
    //     "Balcony Studio · Sunway Resort". Anything after " ·" in the parameter
    //     is ignored. With no match, the default "Choose a stay" stays selected.
    const stay = new URLSearchParams(location.search).get('stay');
    const staySelect = document.querySelector('#stay-choice');
    if (stay && staySelect) {
      const wanted = stay.toLowerCase().split(' ·')[0];
      const match = [...staySelect.options].find(option => option.text.toLowerCase().startsWith(wanted));
      if (match) staySelect.value = match.value;
    }

    // 3b. Move-in date cannot be in the past. Setting `min` greys out earlier
    //     days in the date picker, and validate() below enforces it on typed input.
    //     The date is built from local time on purpose: toISOString() would give
    //     the UTC date, which in Malaysia (UTC+8) is still "yesterday" between
    //     00:00 and 08:00.
    const date = document.querySelector('#move-date');
    if (date) {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      date.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    // 3c. Live character counter ("0/400"). The textarea's maxlength="400"
    //     enforces the actual limit.
    const message = document.querySelector('#message');
    const charCount = document.querySelector('#char-count');
    message?.addEventListener('input', () => {
      if (charCount) charCount.textContent = String(message.value.length);
    });

    // 3d. Fields to validate: every required input/select except the consent
    //     checkbox, which is handled separately on submit. Each field's error
    //     element is the <small class="field-error"> inside the same <label>,
    //     so the markup must keep that nesting.
    const fields = [...form.querySelectorAll('input[required], select[required]')].filter(field => field.id !== 'consent');
    const errorFor = field => field.closest('label')?.querySelector('.field-error');

    // Validates one field and returns true if it is valid. Rules are checked in
    // order and only the first failing message is shown:
    //   1) required – empty after trimming
    //   2) email    – basic "x@y.z" pattern (format only, not deliverability)
    //   3) name     – at least 2 characters (mirrors minlength="2")
    //   4) date     – not before `min`; YYYY-MM-DD strings compare correctly as text
    // Output: toggles .invalid (red border), sets aria-invalid, writes/clears the
    // inline error text.
    const validate = field => {
      let error = '';
      if (!field.value.trim()) error = 'Please complete this field.';
      else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) error = 'Enter a valid email address.';
      else if (field.name === 'name' && field.value.trim().length < 2) error = 'Enter at least 2 characters.';
      else if (field.type === 'date' && field.value < field.min) error = 'Choose today or a future date.';
      field.classList.toggle('invalid', Boolean(error));
      field.setAttribute('aria-invalid', String(Boolean(error)));
      // Caveat: the error text is not linked with aria-describedby, so screen
      // readers do not announce it automatically when the field is focused.
      const errorElement = errorFor(field);
      if (errorElement) errorElement.textContent = error;
      return !error;
    };

    // Validate on blur and again on submit. After correction, an error clears
    // on the next validation, not immediately while typing.
    fields.forEach(field => field.addEventListener('blur', () => validate(field)));

    // 3e. Submit: stop the real submission (no reload, no network request),
    //     validate every field plus the consent checkbox, then show the result.
    const success = document.querySelector('#form-success');
    form.addEventListener('submit', event => {
      event.preventDefault();
      // map() before every() so every field is validated and shows its own
      // error; every() alone would stop at the first invalid field.
      const validFields = fields.map(validate).every(Boolean);
      const consent = document.querySelector('#consent');
      const consentError = document.querySelector('#consent-error');
      if (consentError) consentError.textContent = consent.checked ? '' : 'Please confirm before continuing.';

      if (!validFields || !consent.checked) {
        // Hide a success message left over from an earlier valid submit, then
        // move focus to the first invalid field, or to the checkbox if the
        // fields are all valid and only consent is missing.
        if (success) success.hidden = true;
        (form.querySelector('.invalid') || consent).focus();
        return;
      }

      // All valid: reveal the success message and scroll it into view
      // (block: 'nearest' does not scroll if it is already visible).
      // The CSS rule .form-success[hidden] keeps it hidden until this point.
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
});
