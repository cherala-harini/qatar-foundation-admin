const captchas = { login:'', signup:'', forgot:'' };
function generateCaptcha(type) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    captchas[type] = code;
    const el = document.getElementById(type + 'CaptchaText');
    if (el) el.textContent = code;
}
generateCaptcha('login');
generateCaptcha('signup');
generateCaptcha('forgot');

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
    setTimeout(() => {
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
    }, 50);
    document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input').forEach(i => i.classList.remove('error'));
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass
        ? '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ===== HELPERS =====
function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (msg) el.querySelector('span').textContent = msg;
    el.classList.add('show');
}
function clearAllErrors(formId) {
    document.querySelectorAll('#' + formId + ' .error-msg').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('#' + formId + ' input').forEach(i => i.classList.remove('error'));
}
function shakeForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 400);
}
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function showToast(msg) {
    const toastMsg = document.getElementById('toastMsg');
    const toast = document.getElementById('toast');
    if (toastMsg && toast) {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function checkStrength(val) {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const labels = ['','Weak','Medium','Strong','Very Strong'];
    const classes = ['','weak','medium','strong','very-strong'];
    for (let i = 1; i <= 4; i++) {
        const bar = document.getElementById('str' + i);
        if (bar) {
            bar.className = 'strength-bar';
            if (i <= score) bar.classList.add(classes[score]);
        }
    }
    const lbl = document.getElementById('strengthLabel');
    if (lbl) lbl.textContent = val.length > 0 ? labels[score] : '';
}

// ===== SHOW DASHBOARD =====
function showDashboard(email) {
    document.getElementById('authWrapper').style.display = 'none';
    document.getElementById('dashboardWrapper').classList.add('active');
    document.body.style.alignItems = 'stretch';

    // Personalize
    const name = email.split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    document.getElementById('dashName').textContent = displayName;
    document.getElementById('dashAvatar').textContent = displayName.substring(0, 2).toUpperCase();

    // Show menu toggle on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('menuToggle').style.display = 'flex';
    }

    // Load active backend data once the user views the dashboard
    loadOpportunities();
}

// ===== LOGOUT =====
function handleLogout() {
    fetch('/api/logout', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        document.getElementById('dashboardWrapper').classList.remove('active');
        document.getElementById('authWrapper').style.display = 'flex';
        document.body.style.alignItems = '';
        showToast('Signed out successfully');
        showPage('loginPage');
    })
    .catch(err => {
        console.error('Logout error:', err);
        showToast('Error logging out. Please try again.');
    });
}

// ===== NAVIGATION ITEMS =====
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', function() {
        const page = this.getAttribute('data-page');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
        
        if (page === 'dashboard') {
            document.getElementById('dashboardSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Dashboard';
        } else if (page === 'learner') {
            document.getElementById('learnerSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Learner Management';
        } else if (page === 'verifier') {
            document.getElementById('verifierSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Verifier Management';
        } else if (page === 'collaborator') {
            document.getElementById('collaboratorSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Collaborator Management';
        } else if (page === 'opportunity') {
            document.getElementById('opportunitySection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Opportunity Management';
            loadOpportunities(); // Sync on navigate
        } else if (page === 'reports') {
            document.getElementById('reportsSection').classList.add('active');
            document.getElementById('pageTitle').textContent = 'Reports and Analytics';
        }
    });
});

// ===== FETCH & RENDER OPPORTUNITIES =====
function loadOpportunities() {
    fetch('/api/opportunities')
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            renderOpportunities(response.data);
        }
    })
    .catch(err => console.error('Error fetching opportunities:', err));
}

function renderOpportunities(opportunities) {
    const grid = document.querySelector('.opportunities-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (opportunities.length === 0) {
        grid.innerHTML = '<p class="no-data">No active opportunities found. Add one to get started!</p>';
        return;
    }

    opportunities.forEach(op => {
        const card = document.createElement('div');
        card.className = 'opportunity-card';
        card.setAttribute('data-id', op.id);

        const skills = op.skills.split(',').map(s => s.trim()).filter(Boolean);

        const headerHtml = `
            <div class="opportunity-card-header">
                <h5>${escapeHtml(op.name)}</h5>
                <div class="opportunity-meta">
                    <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(op.duration)}</span>
                    <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(op.start_date)}</span>
                </div>
            </div>
            <p class="opportunity-description">${escapeHtml(op.description)}</p>
        `;

        const skillsHtml = `
            <div class="opportunity-skills">
                <div class="opportunity-skills-label">Skills You'll Gain</div>
                <div class="skills-tags">
                    ${skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
                </div>
            </div>
        `;

        const maxLabel = (op.max_applicants && op.max_applicants !== 'Unlimited')
            ? `${escapeHtml(String(op.max_applicants))} spots`
            : 'Unlimited spots';

        const footerHtml = `
            <div class="opportunity-footer" style="display: flex; gap: 8px; justify-content: space-between; align-items: center;">
                <span class="applicants-count">${maxLabel}</span>
                <div class="opportunity-actions" style="display: flex; gap: 6px;">
                    <button class="view-course-btn" onclick="openAndFetchDetails(${op.id})" style="width: auto; padding: 6px 12px;">View Details</button>
                    <button class="view-course-btn" onclick="openEditOpportunity(${op.id})" style="width: auto; padding: 6px 12px; background: var(--secondary, #6366f1);">Edit</button>
                    <button class="delete-btn" onclick="deleteOpportunity(${op.id})" style="background: var(--danger, #ef4444); color: white; border: none; border-radius: 4px; cursor: pointer; padding: 6px 12px;">Delete</button>
                </div>
            </div>
        `;

        card.innerHTML = headerHtml + skillsHtml + footerHtml;
        grid.appendChild(card);
    });
}

// ===== OPPORTUNITY ACTIONS (GET DETAILS & DELETE) =====
function openAndFetchDetails(id) {
    fetch(`/api/opportunities/${id}`)
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            const op = response.data;
            openOpportunityDetails(op.name, {
                duration: op.duration,
                startDate: op.start_date,
                applicants: op.max_applicants,
                description: op.description,
                futureOpportunities: op.future_opportunities || 'None provided',
                prerequisites: op.skills,
                skills: op.skills.split(',').map(s => s.trim())
            });
        }
    })
    .catch(err => console.error('Error fetching individual details:', err));
}

function deleteOpportunity(id) {
    if (!confirm('Are you sure you want to permanently delete this opportunity?')) return;

    fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            showToast('Opportunity deleted successfully!');
            loadOpportunities();
        } else {
            showToast(response.error || 'Failed to delete');
        }
    })
    .catch(err => console.error('Error deleting:', err));
}

// ===== LOGIN FORM WITH API =====
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    clearAllErrors('loginForm');
    let valid = true;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const captchaInput = document.getElementById('loginCaptchaInput').value.trim();

    if (!email || !isValidEmail(email)) { showError('loginEmailErr'); document.getElementById('loginEmail').classList.add('error'); valid = false; }
    if (!password) { showError('loginPasswordErr','Please enter your password'); document.getElementById('loginPassword').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('loginCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.login) { showError('loginCaptchaErr','Captcha does not match.'); valid = false; generateCaptcha('login'); }

    if (!valid) { shakeForm('loginForm'); return; }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Login successful! Redirecting...');
            setTimeout(() => showDashboard(email), 1200);
        } else {
            showError('loginEmailErr', data.error || 'Invalid login details');
            shakeForm('loginForm');
        }
        generateCaptcha('login');
    })
    .catch(err => {
        console.error('Login Fetch Error:', err);
        showToast('Connection error. Please try again.');
    });
});

// ===== SIGNUP FORM WITH API =====
document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    clearAllErrors('signupForm');
    let valid = true;
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    const captchaInput = document.getElementById('signupCaptchaInput').value.trim();

    if (!name) { showError('signupNameErr'); document.getElementById('signupName').classList.add('error'); valid = false; }
    if (!email || !isValidEmail(email)) { showError('signupEmailErr'); document.getElementById('signupEmail').classList.add('error'); valid = false; }
    if (!password || password.length < 8) { showError('signupPasswordErr'); document.getElementById('signupPassword').classList.add('error'); valid = false; }
    if (!confirmPassword || password !== confirmPassword) { showError('signupConfirmPasswordErr'); document.getElementById('signupConfirmPassword').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('signupCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.signup) { showError('signupCaptchaErr','Captcha does not match.'); valid = false; generateCaptcha('signup'); }

    if (!valid) { shakeForm('signupForm'); return; }

    fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: name,
            email: email,
            password: password,
            confirm_password: confirmPassword
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Account created successfully!');
            generateCaptcha('signup');
            this.reset(); checkStrength('');
            setTimeout(() => showPage('loginPage'), 1500);
        } else {
            showError('signupEmailErr', data.error || 'Email already registered');
            shakeForm('signupForm');
        }
    })
    .catch(err => {
        console.error('Signup Error:', err);
        showToast('Connection error. Please try again.');
    });
});

// ===== FORGOT FORM WITH API =====
document.getElementById('forgotForm').addEventListener('submit', function(e) {
    e.preventDefault();
    clearAllErrors('forgotForm');
    let valid = true;
    const email = document.getElementById('forgotEmail').value.trim();
    const captchaInput = document.getElementById('forgotCaptchaInput').value.trim();

    if (!email || !isValidEmail(email)) { showError('forgotEmailErr'); document.getElementById('forgotEmail').classList.add('error'); valid = false; }
    if (!captchaInput) { showError('forgotCaptchaErr','Please enter the captcha code'); valid = false; }
    else if (captchaInput !== captchas.forgot) { showError('forgotCaptchaErr','Captcha does not match.'); valid = false; generateCaptcha('forgot'); }

    if (!valid) { shakeForm('forgotForm'); return; }

    fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
    })
    .then(res => res.json())
    .then(data => {
        showToast('Reset link generated in terminal!');
        generateCaptcha('forgot');
        this.reset();
    })
    .catch(err => {
        console.error('Forgot password Error:', err);
        showToast('Network error, please try again.');
    });
});

// ===== EDIT STATE TRACKER =====
// null  → form is in "create new" mode
// number → form is in "edit" mode for that opportunity id
let currentEditId = null;

// ===== OPEN EDIT MODAL (US-2.5) =====
function openEditOpportunity(id) {
    fetch(`/api/opportunities/${id}`)
    .then(res => res.json())
    .then(response => {
        if (response.status !== 'success') {
            showToast('Could not load opportunity data.');
            return;
        }
        const op = response.data;
        currentEditId = id;

        // Pre-fill every field with existing data
        document.getElementById('oppName').value        = op.name || '';
        document.getElementById('oppDuration').value    = op.duration || '';
        document.getElementById('oppStartDate').value   = op.start_date || '';
        document.getElementById('oppDescription').value = op.description || '';
        document.getElementById('oppSkills').value      = op.skills || '';
        document.getElementById('oppCategory').value    = op.category || '';
        document.getElementById('oppFuture').value      = op.future_opportunities || '';
        const maxEl = document.getElementById('oppMaxApplicants');
        if (maxEl) {
            maxEl.value = (op.max_applicants && op.max_applicants !== 'Unlimited')
                ? op.max_applicants : '';
        }

        // Update modal title & submit button text to signal edit mode
        const modalTitle = document.querySelector('#opportunityModal h3, #opportunityModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Edit Opportunity';
        const submitBtn = document.querySelector('#opportunityForm button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Update Opportunity';

        openOpportunityModal();
    })
    .catch(err => {
        console.error('Error loading opportunity for edit:', err);
        showToast('Error loading opportunity.');
    });
}

// Reset modal back to "create" state whenever it is closed
const _origCloseOpportunityModal = closeOpportunityModal;
closeOpportunityModal = function () {
    _origCloseOpportunityModal();
    currentEditId = null;                     // clear edit state

    const modalTitle = document.querySelector('#opportunityModal h3, #opportunityModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Opportunity';
    const submitBtn = document.querySelector('#opportunityForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Create Opportunity';
};

// ===== OPPORTUNITY FORM SUBMIT — CREATE OR EDIT =====
document.getElementById('opportunityForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name              = document.getElementById('oppName').value.trim();
    const duration          = document.getElementById('oppDuration').value.trim();
    const startDate         = document.getElementById('oppStartDate').value;
    const description       = document.getElementById('oppDescription').value.trim();
    const skillsRaw         = document.getElementById('oppSkills').value.trim();
    const category          = document.getElementById('oppCategory').value;
    const futureOpportunities = document.getElementById('oppFuture').value.trim();
    const maxApplicants     = document.getElementById('oppMaxApplicants').value.trim();

    // future_opportunities is required; max_applicants is optional (US-2.2)
    if (!name || !duration || !startDate || !description || !skillsRaw || !category || !futureOpportunities) {
        showToast('Please fill all required fields');
        return;
    }

    // Route to PUT (edit) or POST (create) based on currentEditId
    const isEditing = currentEditId !== null;
    const apiUrl    = isEditing ? `/api/opportunities/${currentEditId}` : '/api/opportunities';
    const apiMethod = isEditing ? 'PUT' : 'POST';

    fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name:                name,
            duration:            duration,
            start_date:          startDate,
            description:         description,
            skills:              skillsRaw,
            category:            category,
            future_opportunities: futureOpportunities,
            max_applicants:      maxApplicants   // empty string = optional / not set
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            showToast(isEditing ? 'Opportunity updated successfully!' : 'Opportunity created successfully!');
            closeOpportunityModal();
            this.reset();
            loadOpportunities();   // refresh grid without page reload
        } else {
            showToast(response.error || (isEditing ? 'Failed to update.' : 'Failed to create opportunity.'));
        }
    })
    .catch(err => {
        console.error(isEditing ? 'Edit error:' : 'Create error:', err);
        showToast('Connection error. Please try again.');
    });
});

// ===== TAB CHART CONTROLS =====
function changeChartPeriod(period) {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === period) {
            btn.classList.add('active');
        }
    });

    const chartData = {
        daily: 'M0,120 Q50,110 100,90 T200,70 T300,50 T400,40',
        weekly: 'M0,110 Q50,95 100,85 T200,65 T300,45 T400,35',
        monthly: 'M0,100 Q50,85 100,75 T200,55 T300,40 T400,30',
        quarterly: 'M0,90 Q50,75 100,65 T200,50 T300,35 T400,25',
        yearly: 'M0,80 Q50,65 100,55 T200,40 T300,30 T400,20'
    };

    const linePath = document.getElementById('linePath');
    const lineArea = document.getElementById('lineArea');
    if (linePath && lineArea) {
        const path = chartData[period];
        linePath.setAttribute('d', path);
        lineArea.setAttribute('d', path + ' L400,150 L0,150 Z');
    }
}

// ===== NOTIFICATIONS =====
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(item => {
        item.classList.remove('unread');
    });
    showToast('All notifications marked as read');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notificationDropdown');
    const btn = document.getElementById('notifBtn');
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ===== THEME TOGGLE =====
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    
    const icon = document.getElementById('themeIcon');
    if (icon) {
        if (newTheme === 'dark') {
            icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
        } else {
            icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
        }
    }
}

// ===== SEARCH =====
function openSearch() {
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    if (searchContainer && searchInput) {
        searchContainer.classList.add('active');
        searchInput.focus();
    }
}

function closeSearch() {
    const sc = document.getElementById('searchContainer');
    if (sc) sc.classList.remove('active');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearch();
        closeCourseModal();
        closeOpportunityModal();
        closeOpportunityDetailsModal();
        closeCollaboratorCoursesModal();
        closeQuickAddModal();
        closeBulkUploadModal();
        closeQuickAddVerifierModal();
        closeBulkUploadVerifierModal();
        closeVerifierDetailsModal();
    }
});

const sc = document.getElementById('searchContainer');
if (sc) {
    sc.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSearch();
        }
    });
}

// ===== MODAL CONTROLS =====
function openCourseDetails(courseName, stats) {
    document.getElementById('modalCourseTitle').textContent = courseName;
    document.getElementById('modalEnrolled').textContent = stats.enrolled;
    document.getElementById('modalCompleted').textContent = stats.completed;
    document.getElementById('modalInProgress').textContent = stats.inProgress;
    document.getElementById('modalHalfDone').textContent = stats.halfDone;
    document.getElementById('courseModal').classList.add('active');
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
}

const cm = document.getElementById('courseModal');
if (cm) {
    cm.addEventListener('click', function(e) {
        if (e.target === this) closeCourseModal();
    });
}

function openOpportunityDetails(title, details) {
    document.getElementById('opportunityDetailTitle').textContent = title;
    document.getElementById('opportunityDetailDuration').textContent = details.duration;
    document.getElementById('opportunityDetailStartDate').textContent = details.startDate;
    document.getElementById('opportunityDetailApplicants').textContent = details.applicants + ' spots available';
    document.getElementById('opportunityDetailDescription').textContent = details.description;
    document.getElementById('opportunityDetailFuture').textContent = details.futureOpportunities;
    document.getElementById('opportunityDetailPrereqs').textContent = details.prerequisites;
    
    const skillsContainer = document.getElementById('opportunityDetailSkills');
    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        details.skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillsContainer.appendChild(tag);
        });
    }
    document.getElementById('opportunityDetailsModal').classList.add('active');
}

function closeOpportunityDetailsModal() {
    document.getElementById('opportunityDetailsModal').classList.remove('active');
}

const odm = document.getElementById('opportunityDetailsModal');
if (odm) {
    odm.addEventListener('click', function(e) {
        if (e.target === this) closeOpportunityDetailsModal();
    });
}

// ===== MODAL UTILITIES & OTHER FORM DEFAULTS =====
function openQuickAddModal() { document.getElementById('quickAddModal').classList.add('active'); }
function closeQuickAddModal() { document.getElementById('quickAddModal').classList.remove('active'); }
function openOpportunityModal() { document.getElementById('opportunityModal').classList.add('active'); }
function closeOpportunityModal() { document.getElementById('opportunityModal').classList.remove('active'); }
function openBulkUploadModal() { document.getElementById('bulkUploadModal').classList.add('active'); }
function closeBulkUploadModal() { document.getElementById('bulkUploadModal').classList.remove('active'); }

function openCollaboratorCourses(name, role) {
    document.getElementById('collaboratorName').textContent = name + "'s Submitted Courses";
    document.getElementById('collaboratorRole').textContent = 'Role: ' + role;
    document.getElementById('collaboratorCoursesModal').classList.add('active');
}
function closeCollaboratorCoursesModal() { document.getElementById('collaboratorCoursesModal').classList.remove('active'); }

function openQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.add('active'); }
function closeQuickAddVerifierModal() { document.getElementById('quickAddVerifierModal').classList.remove('active'); }
function openBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.add('active'); }
function closeBulkUploadVerifierModal() { document.getElementById('bulkUploadVerifierModal').classList.remove('active'); }

function openVerifierDetails(name, stats) {
    document.getElementById('verifierName').textContent = name;
    document.getElementById('verifierTotalStudents').textContent = stats.totalStudents;
    document.getElementById('verifierCertified').textContent = stats.certified;
    document.getElementById('verifierInProgress').textContent = stats.inProgress;
    
    const container = document.getElementById('subjectsContainer');
    if (container) {
        container.innerHTML = '';
        stats.subjects.forEach(subject => {
            const div = document.createElement('div');
            div.className = 'subject-item';
            div.innerHTML = `<span class="subject-name">${subject.name}</span><span class="subject-students">${subject.students} students</span>`;
            container.appendChild(div);
        });
    }
    document.getElementById('verifierDetailsModal').classList.add('active');
}
function closeVerifierDetailsModal() { document.getElementById('verifierDetailsModal').classList.remove('active'); }

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function() {
        this.classList.remove('error');
        const err = this.closest('.form-group')?.querySelector('.error-msg');
        if (err) err.classList.remove('show');
    });
});

window.addEventListener('resize', () => {
    const toggle = document.getElementById('menuToggle');
    if (toggle) toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
});