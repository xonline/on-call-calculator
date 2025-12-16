document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const addShiftBtn = document.getElementById('add-shift-btn');
    const shiftsContainer = document.getElementById('shifts-container');
    const resultArea = document.getElementById('result-area');
    const showBreakdownCheckbox = document.getElementById('show-breakdown');

    // Inputs
    const jobDescInput = document.getElementById('job-desc');
    const locationInput = document.getElementById('location');

    // Outputs
    const invoicePreview = document.querySelector('.invoice-preview');
    const totalHoursDisplay = document.getElementById('total-hours-display');

    // Initialize with one shift
    addShift();

    addShiftBtn.addEventListener('click', () => {
        addShift();
    });

    calculateBtn.addEventListener('click', () => {
        calculateHours();
    });

    copyBtn.addEventListener('click', () => {
        copyToClipboard();
    });

    function addShift() {
        const shiftId = Date.now();
        const shiftCount = shiftsContainer.children.length + 1;

        const shiftRow = document.createElement('div');
        shiftRow.className = 'shift-row';
        shiftRow.dataset.id = shiftId;

        // Default time: now
        const now = new Date();
        now.setMinutes(Math.round(now.getMinutes() / 15) * 15);
        now.setSeconds(0);
        now.setMilliseconds(0);
        const defaultStart = toLocalISOString(now);

        // Default end: now + 8 hours
        const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const defaultEnd = toLocalISOString(end);

        shiftRow.innerHTML = `
            <div class="shift-header">
                <span class="shift-title">Shift / Day ${shiftCount}</span>
                <button class="remove-shift-btn" aria-label="Remove shift">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="time-grid">
                <div class="input-group">
                    <label>Left House</label>
                    <input type="datetime-local" class="start-time" value="${defaultStart}">
                </div>
                <div class="input-group">
                    <label>Returned Home</label>
                    <input type="datetime-local" class="end-time" value="${defaultEnd}">
                </div>
            </div>
            <div class="driving-grid">
                <div class="input-group">
                    <label>Drive There (mins)</label>
                    <input type="number" class="drive-there" placeholder="0" min="0" value="0">
                </div>
                <div class="input-group">
                    <label>Drive Back (mins)</label>
                    <input type="number" class="drive-back" placeholder="0" min="0" value="0">
                </div>
            </div>
            <div class="input-group">
                <label>Break Duration (minutes)</label>
                <input type="number" class="break-duration" placeholder="0" min="0" value="0">
            </div>
        `;

        shiftsContainer.appendChild(shiftRow);

        // Add event listener for remove button
        const removeBtn = shiftRow.querySelector('.remove-shift-btn');
        removeBtn.addEventListener('click', () => {
            shiftRow.remove();
            updateShiftTitles();
        });
    }

    function updateShiftTitles() {
        const rows = shiftsContainer.querySelectorAll('.shift-row');
        rows.forEach((row, index) => {
            row.querySelector('.shift-title').textContent = `Shift / Day ${index + 1}`;
        });
    }

    function toLocalISOString(date) {
        const pad = (num) => (num < 10 ? '0' : '') + num;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function calculateHours() {
        const jobDesc = jobDescInput.value.trim() || 'Job';
        const location = locationInput.value.trim() || 'Location';
        const showBreakdown = showBreakdownCheckbox.checked;

        const shiftRows = document.querySelectorAll('.shift-row');

        if (shiftRows.length === 0) {
            alert('Please add at least one shift.');
            return;
        }

        let grandTotalHours = 0;
        let invoiceText = `${jobDesc} at ${location}\n\n`;

        let hasError = false;

        shiftRows.forEach((row) => {
            if (hasError) return;

            const startInput = row.querySelector('.start-time');
            const endInput = row.querySelector('.end-time');
            const breakInput = row.querySelector('.break-duration');
            const driveThereInput = row.querySelector('.drive-there');
            const driveBackInput = row.querySelector('.drive-back');

            const startStr = startInput.value;
            const endStr = endInput.value;
            const breakMins = parseFloat(breakInput.value) || 0;
            const driveThereMins = parseFloat(driveThereInput.value) || 0;
            const driveBackMins = parseFloat(driveBackInput.value) || 0;

            if (!startStr || !endStr) {
                alert('Please select start and end times for all shifts.');
                hasError = true;
                return;
            }

            const startDate = new Date(startStr);
            const endDate = new Date(endStr);

            if (endDate <= startDate) {
                alert('End time must be after start time for all shifts.');
                hasError = true;
                return;
            }

            let totalDiffMs = endDate - startDate;

            // Total Driving
            const totalDrivingMins = driveThereMins + driveBackMins;
            const totalDrivingMs = totalDrivingMins * 60 * 1000;

            // Break
            const breakMs = breakMins * 60 * 1000;

            // On Site = Total Duration - Driving - Break
            // Note: If Driving + Break > Total Duration, that's an error or 0 on-site.
            let onSiteMs = totalDiffMs - totalDrivingMs - breakMs;

            if (onSiteMs < 0) {
                alert('Driving time + Break duration cannot be longer than the total duration.');
                hasError = true;
                return;
            }

            // Billable = On Site + Driving (Assuming driving is billable)
            // Or simply Total Duration - Break.
            // The user asked for "driving hours separated and then on site hours".
            // Usually billable = total time minus unpaid break.
            const billableMs = totalDiffMs - breakMs;
            const billableHours = billableMs / (1000 * 60 * 60);

            grandTotalHours += billableHours;

            // Format Date: Friday 14 Dec 2025
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const dayName = days[startDate.getDay()];
            const dayNum = startDate.getDate();
            const monthName = months[startDate.getMonth()];
            const year = startDate.getFullYear();

            const dateStr = `${dayName} ${dayNum} ${monthName} ${year}`;

            // Format Time: 11.20 - 18.04
            const formatTime = (date) => {
                let hours = date.getHours().toString().padStart(2, '0');
                let minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}.${minutes}`;
            };

            const startTimeStr = formatTime(startDate);
            const endTimeStr = formatTime(endDate);

            let line = `${dateStr}\n${startTimeStr} - ${endTimeStr}`;

            if (showBreakdown) {
                const onSiteHours = onSiteMs / (1000 * 60 * 60);
                const drivingHours = totalDrivingMs / (1000 * 60 * 60);
                line += ` (On Site: ${onSiteHours.toFixed(2)}h, Driving: ${drivingHours.toFixed(2)}h`;
                if (breakMins > 0) line += `, Break: ${breakMins}m`;
                line += `)`;
            } else {
                if (breakMins > 0) {
                    line += ` (Break: ${breakMins}m)`;
                }
            }

            invoiceText += line + '\n';
        });

        if (hasError) return;

        // Update UI
        invoicePreview.textContent = invoiceText;
        totalHoursDisplay.textContent = `${grandTotalHours.toFixed(2)} hrs`;

        // Show result
        resultArea.classList.remove('result-hidden');
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function copyToClipboard() {
        const invoiceContent = invoicePreview.textContent;
        const total = totalHoursDisplay.textContent;

        const textToCopy = `${invoiceContent}\nTotal: ${total}`;

        try {
            await navigator.clipboard.writeText(textToCopy);

            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);

        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
});
