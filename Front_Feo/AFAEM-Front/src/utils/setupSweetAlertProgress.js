import Swal from 'sweetalert2';

let globalProgressInterval = null;
let currentProgress = 0;

// Save original SweetAlert2 methods
const originalFire = Swal.fire;
const originalShowLoading = Swal.showLoading;
const originalHideLoading = Swal.hideLoading;
const originalClose = Swal.close;

// Flag to prevent recursive fire/close loops during transition delay
let isCompletingLoader = false;

// Helper to inject/update the progress bar HTML
const injectProgressBar = () => {
  const container = Swal.getHtmlContainer();
  if (!container) return null;

  let progressBarContainer = container.querySelector('.swal-progress-bar-container');
  if (!progressBarContainer) {
    progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'swal-progress-bar-container';
    progressBarContainer.style.width = '100%';
    progressBarContainer.innerHTML = `
      <style>
        @keyframes swal-progress-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      </style>
      <div style="width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; position: relative; margin-top: 18px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #cbd5e1;">
        <div class="swal-progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #1a3b5c 0%, #3b82f6 100%); border-radius: 999px; transition: width 0.3s cubic-bezier(0.1, 0.8, 0.3, 1); position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent); animation: swal-progress-shine 1.5s infinite;"></div>
        </div>
      </div>
      <div class="swal-progress-bar-text" style="font-size: 11px; color: #1a3b5c; font-weight: 800; margin-top: 8px; text-align: right; font-family: sans-serif;">
        0%
      </div>
    `;
    container.appendChild(progressBarContainer);
  }
  return progressBarContainer;
};

// Override showLoading
Swal.showLoading = function() {
  // Execute original SweetAlert2 loading logic (hides buttons, opens overlay)
  originalShowLoading.apply(Swal);

  // Hide the default circular spinner loader element
  const loader = Swal.getLoader();
  if (loader) {
    loader.style.setProperty('display', 'none', 'important');
  }

  // Inject our custom horizontal progress bar
  const progressBarContainer = injectProgressBar();
  if (progressBarContainer) {
    const barFill = progressBarContainer.querySelector('.swal-progress-bar-fill');
    const barText = progressBarContainer.querySelector('.swal-progress-bar-text');

    currentProgress = 0;
    if (globalProgressInterval) clearInterval(globalProgressInterval);

    // Simulated natural loading progression:
    // - Starts fast to display activity immediately
    // - Decelerates non-linearly
    // - Capped at 97.5% until fully done
    globalProgressInterval = setInterval(() => {
      if (!Swal.isVisible()) {
        clearInterval(globalProgressInterval);
        return;
      }

      if (currentProgress < 95) {
        let increment = 0;
        if (currentProgress < 35) {
          // Rapid jump at first
          increment = Math.random() * 8 + 4;
        } else if (currentProgress < 65) {
          // Normal advance
          increment = Math.random() * 3 + 1;
        } else if (currentProgress < 88) {
          // Slow down
          increment = Math.random() * 1.0 + 0.15;
        } else {
          // Asymptotically approach 97.5%
          increment = Math.random() * 0.12 + 0.01;
        }

        currentProgress = Math.min(currentProgress + increment, 97.5);
        if (barFill) barFill.style.width = `${currentProgress}%`;
        if (barText) barText.innerText = `${Math.floor(currentProgress)}%`;
      }
    }, 250);
  }
};

// Override hideLoading
Swal.hideLoading = function() {
  if (globalProgressInterval) {
    clearInterval(globalProgressInterval);
    globalProgressInterval = null;
  }
  originalHideLoading.apply(Swal);
};

// Override close / closeActivePopup
Swal.close = function(...args) {
  if (isCompletingLoader) {
    originalClose.apply(Swal, args);
    return;
  }

  if (globalProgressInterval) {
    clearInterval(globalProgressInterval);
    globalProgressInterval = null;

    const popup = Swal.getPopup();
    if (popup) {
      const barFill = popup.querySelector('.swal-progress-bar-fill');
      const barText = popup.querySelector('.swal-progress-bar-text');

      if (barFill && barText) {
        isCompletingLoader = true;
        barFill.style.transition = 'width 0.25s ease-out';
        barFill.style.width = '100%';
        barText.innerText = '100%';

        // Wait for the visual transition to complete before dismissing modal
        setTimeout(() => {
          originalClose.apply(Swal, args);
          isCompletingLoader = false;
        }, 300);
        return;
      }
    }
  }

  originalClose.apply(Swal, args);
};

// Override fire
Swal.fire = function(...args) {
  // If a new popup is fired while our progress bar is active (e.g. success checkmark popup),
  // we want to instantly fill the progress bar to 100% and delay the next fire for a smoother experience.
  if (globalProgressInterval && !isCompletingLoader) {
    clearInterval(globalProgressInterval);
    globalProgressInterval = null;

    const popup = Swal.getPopup();
    if (popup) {
      const barFill = popup.querySelector('.swal-progress-bar-fill');
      const barText = popup.querySelector('.swal-progress-bar-text');

      if (barFill && barText) {
        isCompletingLoader = true;
        barFill.style.transition = 'width 0.25s ease-out';
        barFill.style.width = '100%';
        barText.innerText = '100%';

        return new Promise((resolve) => {
          setTimeout(() => {
            isCompletingLoader = false;
            resolve(originalFire.apply(Swal, args));
          }, 300);
        });
      }
    }
  }

  return originalFire.apply(Swal, args);
};
