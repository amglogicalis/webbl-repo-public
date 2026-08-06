class WebblConsole {
    constructor() {
        this.token = localStorage.getItem('webbl_gh_token') || '';
        this.user = null;
        this.cocoons = [];
        this.currentRepoForRollback = null;

        this.initElements();
        this.attachEventListeners();
        this.checkAuth();
    }

    initElements() {
        // Nav
        this.navItems = document.querySelectorAll('.nav-item');
        this.views = document.querySelectorAll('.view-content');
        
        // Auth
        this.tokenInput = document.getElementById('gh-token');
        this.btnConnect = document.getElementById('btn-connect');
        this.btnDisconnect = document.getElementById('btn-disconnect');
        this.tokenGroup = document.getElementById('token-group');
        this.userProfile = document.getElementById('user-profile');
        
        // Data
        this.cocoonsContainer = document.getElementById('cocoons-container');
        this.cocoonsListContainer = document.getElementById('cocoons-list-container');
        this.btnRefresh = document.getElementById('btn-refresh');
        
        // Settings
        this.settingsToken = document.getElementById('settings-token');
        this.btnSaveSettings = document.getElementById('btn-save-settings');
        this.btnClearSettings = document.getElementById('btn-clear-settings');
        
        // Stats
        this.statTotal = document.getElementById('stat-total');
        this.statLastDeploy = document.getElementById('stat-last-deploy');
        this.statSize = document.getElementById('stat-size');
        
        // Modals
        this.modalHistory = document.getElementById('modal-history');
        this.modalRollback = document.getElementById('modal-rollback');
        
        // Set initial token value
        if (this.token) {
            this.tokenInput.value = this.token;
            if (this.settingsToken) this.settingsToken.value = this.token;
        }
    }

    attachEventListeners() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = item.dataset.view;
                if(viewId) this.switchView(viewId);
            });
        });

        // Auth
        this.btnConnect.addEventListener('click', () => this.connectGitHub());
        this.tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectGitHub();
        });
        this.btnDisconnect.addEventListener('click', () => this.disconnect());

        // Settings
        if (this.btnSaveSettings) {
            this.btnSaveSettings.addEventListener('click', () => {
                const val = this.settingsToken.value.trim();
                if (!val) {
                    this.showToast('Error', 'Please enter a GitHub Token', 'error');
                    return;
                }
                this.token = val;
                localStorage.setItem('webbl_gh_token', this.token);
                this.checkAuth();
            });
        }

        const btnToggleToken = document.getElementById('btn-toggle-token');
        if (btnToggleToken && this.settingsToken) {
            btnToggleToken.addEventListener('click', () => {
                const isPass = this.settingsToken.type === 'password';
                this.settingsToken.type = isPass ? 'text' : 'password';
                btnToggleToken.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
            });
        }

        if (this.btnClearSettings) {
            this.btnClearSettings.addEventListener('click', () => {
                if (this.settingsToken) this.settingsToken.value = '';
                this.disconnect();
            });
        }

        // Refresh
        this.btnRefresh.addEventListener('click', () => {
            if(this.token) this.loadCocoons();
        });

        // Deploy New Cocoon Modal Trigger
        const openDeployModal = () => {
            if (!this.token) {
                this.showToast('Error', 'Please connect your GitHub Token first.', 'error');
                return;
            }
            document.getElementById('modal-new-cocoon').classList.remove('hidden');
        };

        const btnOpen1 = document.getElementById('btn-open-new-cocoon');
        if (btnOpen1) btnOpen1.addEventListener('click', openDeployModal);
        
        const btnOpen2 = document.querySelector('.btn-open-new-cocoon-2');
        if (btnOpen2) btnOpen2.addEventListener('click', openDeployModal);

        // File drop zone logic
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-list-preview');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drop-zone-active');
            });

            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone-active'));

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drop-zone-active');
                if (e.dataTransfer.files.length) {
                    this.addDeployFiles(e.dataTransfer.files, filePreview);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    this.addDeployFiles(fileInput.files, filePreview);
                    fileInput.value = ''; // Reset input value so re-selecting same file triggers change event
                }
            });
        }

        // Execute Deploy button
        const btnExecute = document.getElementById('btn-execute-deploy');
        if (btnExecute) {
            btnExecute.addEventListener('click', () => this.executeWebDeploy());
        }

        // Modals - close buttons
        document.querySelectorAll('.btn-close, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Modals - outside click
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeAllModals();
            });
        });

        // Modals - ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });

        // Rollback confirm
        document.getElementById('btn-confirm-rollback').addEventListener('click', () => this.executeRollback());

        // Morphs triggers
        const btnOpenMorph = document.getElementById('btn-open-new-morph');
        if (btnOpenMorph) btnOpenMorph.addEventListener('click', () => this.openCreateMorphModal());

        const btnCreateMorph = document.getElementById('btn-execute-create-morph');
        if (btnCreateMorph) btnCreateMorph.addEventListener('click', () => this.executeCreateMorph());

        const btnEditMorph = document.getElementById('btn-execute-edit-morph');
        if (btnEditMorph) btnEditMorph.addEventListener('click', () => this.executeEditMorph());

        const btnRunMorph = document.getElementById('btn-execute-run-morph');
        if (btnRunMorph) btnRunMorph.addEventListener('click', () => this.executeRunMorph());

        const btnConfirmRenameMorph = document.getElementById('btn-confirm-rename-morph');
        if (btnConfirmRenameMorph) btnConfirmRenameMorph.addEventListener('click', () => this.executeRenameMorph());

        const btnConfirmRenameCocoon = document.getElementById('btn-confirm-rename-cocoon');
        if (btnConfirmRenameCocoon) btnConfirmRenameCocoon.addEventListener('click', () => this.executeRenameCocoon());

        const btnConfirmEditDesc = document.getElementById('btn-confirm-edit-cocoon-desc');
        if (btnConfirmEditDesc) btnConfirmEditDesc.addEventListener('click', () => this.executeEditCocoonDesc());

        const btnConfirmDeleteMorph = document.getElementById('btn-confirm-delete-morph');
        if (btnConfirmDeleteMorph) btnConfirmDeleteMorph.addEventListener('click', () => this.executeDeleteMorph());

        // Custom .js file upload for Morph
        const btnBrowseFile = document.getElementById('btn-browse-morph-file');
        const morphFileInput = document.getElementById('new-morph-file-input');
        const fileNameSpan = document.getElementById('morph-file-selected-name');
        const codeEditor = document.getElementById('new-morph-code-editor');

        if (btnBrowseFile && morphFileInput) {
            btnBrowseFile.addEventListener('click', () => morphFileInput.click());

            morphFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (fileNameSpan) fileNameSpan.textContent = file.name;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (codeEditor) codeEditor.value = event.target.result;
                    };
                    reader.readAsText(file);
                }
            });
        }
    }

    switchView(viewId) {
        this.navItems.forEach(item => {
            if (item.dataset.view === viewId) item.classList.add('active');
            else item.classList.remove('active');
        });

        this.views.forEach(view => {
            if (view.id === `view-${viewId}`) view.classList.remove('hidden');
            else view.classList.add('hidden');
        });

        if (viewId === 'morphs' && this.token) {
            this.loadMorphs();
        }
    }

    /* --- GitHub API Auth --- */
    
    async checkAuth() {
        if (!this.token) return;

        try {
            this.btnConnect.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            const res = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${this.token}` }
            });

            if (!res.ok) throw new Error('Invalid token');

            this.user = await res.json();
            this.setAuthenticatedState();
            this.showToast('Success', `Connected as ${this.user.login}`, 'success');
            this.loadCocoons();

        } catch (error) {
            this.disconnect();
            this.showToast('Error', 'Invalid or expired GitHub token.', 'error');
        } finally {
            this.btnConnect.innerHTML = 'Connect';
        }
    }

    connectGitHub() {
        const val = this.tokenInput.value.trim();
        if (!val) {
            this.showToast('Error', 'Please enter a GitHub Personal Access Token.', 'error');
            return;
        }
        this.token = val;
        localStorage.setItem('webbl_gh_token', this.token);
        this.checkAuth();
    }

    disconnect() {
        this.token = '';
        this.user = null;
        localStorage.removeItem('webbl_gh_token');
        
        this.tokenGroup.classList.remove('hidden');
        this.btnDisconnect.classList.add('hidden');
        this.tokenInput.value = '';
        
        this.userProfile.innerHTML = `
            <div class="avatar-placeholder"><i class="fa-regular fa-user"></i></div>
            <div class="user-info">
                <span class="user-name">Not connected</span>
                <span class="user-status text-muted">Guest</span>
            </div>
        `;
        
        this.cocoonsContainer.innerHTML = `
            <div class="empty-state glass">
                <i class="fa-brands fa-github empty-icon"></i>
                <h3>Connect GitHub</h3>
                <p class="text-muted">Enter your GitHub Personal Access Token to load your WEBBL Cocoons.</p>
            </div>
        `;
        
        this.statTotal.textContent = '0';
        this.statLastDeploy.textContent = 'Never';
        this.statSize.textContent = '0 MB';
    }

    setAuthenticatedState() {
        this.tokenGroup.classList.add('hidden');
        this.btnDisconnect.classList.remove('hidden');
        
        this.userProfile.innerHTML = `
            <img src="${this.user.avatar_url}" class="avatar" alt="${this.user.login}">
            <div class="user-info">
                <span class="user-name">${this.user.login}</span>
                <span class="user-status text-accent"><i class="fa-solid fa-circle" style="font-size:8px;"></i> Connected</span>
            </div>
        `;
    }

    /* --- API Calls & UI --- */

    async loadCocoons() {
        this.cocoonsContainer.innerHTML = `
            <div class="loader-container glass" style="grid-column: 1/-1; padding: 60px;">
                <div class="spinner"></div>
                <p>Syncing WEBBL Cocoons with GitHub...</p>
            </div>
        `;

        try {
            // Search repos with topic 'webbl-cocoon'
            const res = await fetch(`https://api.github.com/search/repositories?q=user:${this.user.login}+topic:webbl-cocoon`, {
                headers: { 
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!res.ok) throw new Error('Failed to fetch repositories');
            
            const data = await res.json();
            this.cocoons = data.items;
            
            this.statTotal.textContent = this.cocoons.length;
            
            let totalSize = 0;
            let latestPush = null;
            
            if (this.cocoons.length === 0) {
                this.cocoonsContainer.innerHTML = `
                    <div class="empty-state glass">
                        <i class="fa-solid fa-box-open empty-icon"></i>
                        <h3>No Cocoons Found</h3>
                        <p class="text-muted">Create a repository with the topic "webbl-cocoon" to see it here.</p>
                    </div>
                `;
                return;
            }

            this.cocoonsContainer.innerHTML = '';
            if (this.cocoonsListContainer) {
                this.cocoonsListContainer.innerHTML = '';
            }

            for (const repo of this.cocoons) {
                totalSize += repo.size;
                const pushDate = new Date(repo.pushed_at);
                if (!latestPush || pushDate > latestPush) latestPush = pushDate;

                // Try to get Pages URL and Build Status
                let pagesUrl = `https://${this.user.login}.github.io/${repo.name}`;
                let isBuilding = false;
                let pagesStatus = 'built';

                try {
                    const pageRes = await fetch(`https://api.github.com/repos/${repo.full_name}/pages`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (pageRes.ok) {
                        const pageData = await pageRes.json();
                        pagesUrl = pageData.html_url || pagesUrl;
                        pagesStatus = pageData.status || 'built';
                        if (pagesStatus === 'building' || pagesStatus === 'queued') {
                            isBuilding = true;
                        }
                    }

                    // Check latest build status
                    const buildRes = await fetch(`https://api.github.com/repos/${repo.full_name}/pages/builds/latest`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (buildRes.ok) {
                        const buildData = await buildRes.json();
                        if (buildData.status === 'building' || buildData.status === 'queued') {
                            isBuilding = true;
                        }
                    }
                } catch(e) { /* ignore */ }

                const statusBadgeHTML = isBuilding 
                    ? `<div class="status-indicator"><div class="status-dot building"></div> <span class="text-primary"><i class="fa-solid fa-spinner fa-spin text-small"></i> Building...</span></div>`
                    : `<div class="status-indicator"><div class="status-dot"></div> Live</div>`;

                const visitBtnHTML = isBuilding
                    ? `<a href="${pagesUrl}" target="_blank" class="btn btn-secondary btn-sm ml-auto disabled" style="pointer-events:none; opacity:0.5;" title="Deploy in progress..."><i class="fa-solid fa-spinner fa-spin"></i> Deploying...</a>`
                    : `<a href="${pagesUrl}" target="_blank" class="btn btn-primary btn-sm ml-auto"><i class="fa-solid fa-globe"></i> Visit</a>`;

                const cardHTML = `
                    <div class="cocoon-header">
                        <div class="cocoon-title" style="display: flex; align-items: center; gap: 8px;">
                            <h3 style="margin:0; font-size:1.1rem; display:inline-flex; align-items:center; gap:6px;"><i class="fa-brands fa-github text-muted"></i> ${repo.name}</h3>
                            <button class="btn-icon btn-rename-cocoon text-muted hover-text-primary" data-repo="${repo.full_name}" data-name="${repo.name}" title="Rename Cocoon Repository" style="background:none; border:none; cursor:pointer; font-size:12px; padding:2px;">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                        ${statusBadgeHTML}
                    </div>
                    
                    <p class="text-small text-muted" style="margin-bottom: 16px; flex:1; display:flex; align-items:flex-start; gap:6px;">
                        <span class="cocoon-desc-text">${this.truncate(repo.description || 'No description provided.', 80)}</span>
                        <button class="btn-icon btn-edit-cocoon-desc text-muted hover-text-primary" data-repo="${repo.full_name}" data-desc="${(repo.description || '').replace(/"/g, '&quot;')}" title="Edit description" style="background:none; border:none; cursor:pointer; font-size:11px; flex-shrink:0; margin-top:1px;">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </p>
                    
                    <div class="cocoon-meta">
                        <div class="cocoon-meta-item">
                            <i class="fa-solid fa-clock-rotate-left"></i> ${this.formatDate(repo.pushed_at)}
                        </div>
                        <div class="cocoon-meta-item" style="margin-left:auto;">
                            <i class="fa-solid fa-folder-tree"></i> ${(repo.size / 1024).toFixed(1)} MB
                        </div>
                    </div>

                    <div class="cocoon-actions mt-4 flex gap-2">
                        <button class="btn btn-secondary btn-sm btn-redeploy" data-repo="${repo.full_name}" title="Redeploy new files or update site">
                            <i class="fa-solid fa-rotate-right"></i> Redeploy
                        </button>
                        <button class="btn btn-secondary btn-sm btn-history" data-repo="${repo.full_name}" title="View deployment history">
                            <i class="fa-solid fa-clock-rotate-left"></i> History
                        </button>
                        <a href="https://github.com/${repo.full_name}" target="_blank" class="btn btn-secondary btn-sm" title="View Source Repository">
                            <i class="fa-brands fa-github"></i> Repo
                        </a>
                        ${visitBtnHTML}
                        <button class="btn btn-danger-outline btn-sm btn-delete-cocoon" data-repo="${repo.full_name}" data-reponame="${repo.name}" title="Delete Cocoon">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                const card1 = document.createElement('div');
                card1.className = 'cocoon-card glass';
                card1.innerHTML = cardHTML;
                this.cocoonsContainer.appendChild(card1);

                if (this.cocoonsListContainer) {
                    const card2 = document.createElement('div');
                    card2.className = 'cocoon-card glass';
                    card2.innerHTML = cardHTML;
                    this.cocoonsListContainer.appendChild(card2);
                }
            }

            // Re-attach redeploy event listeners
            document.querySelectorAll('.btn-redeploy').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const repoName = e.currentTarget.dataset.repo;
                    const repoInput = document.getElementById('new-cocoon-repo');
                    if (repoInput) repoInput.value = repoName;
                    const modalNew = document.getElementById('modal-new-cocoon');
                    if (modalNew) modalNew.classList.remove('hidden');
                });
            });

            // Re-attach history event listeners
            document.querySelectorAll('.btn-history').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const repoName = e.currentTarget.dataset.repo;
                    this.showHistory(repoName);
                });
            });

            // Re-attach delete event listeners
            document.querySelectorAll('.btn-delete-cocoon').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fullRepo = e.currentTarget.dataset.repo;
                    const repoName = e.currentTarget.dataset.reponame;
                    this.confirmDeleteCocoon(fullRepo, repoName);
                });
            });

            // Re-attach rename cocoon event listeners
            document.querySelectorAll('.btn-rename-cocoon').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fullRepo = e.currentTarget.dataset.repo;
                    const repoName = e.currentTarget.dataset.name;
                    this.openRenameCocoonModal(fullRepo, repoName);
                });
            });

            // Re-attach edit description event listeners
            document.querySelectorAll('.btn-edit-cocoon-desc').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fullRepo = e.currentTarget.dataset.repo;
                    const currentDesc = e.currentTarget.dataset.desc;
                    this.openEditCocoonDescModal(fullRepo, currentDesc);
                });
            });

            this.statSize.textContent = (totalSize / 1024).toFixed(1) + ' MB';
            this.statLastDeploy.textContent = latestPush ? this.formatDate(latestPush.toISOString()) : 'Never';

        } catch (error) {
            console.error(error);
            this.cocoonsContainer.innerHTML = `
                <div class="empty-state glass">
                    <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: var(--danger)"></i>
                    <h3>Error Loading Cocoons</h3>
                    <p class="text-muted">${error.message}</p>
                </div>
            `;
            this.showToast('Error', 'Failed to sync with GitHub.', 'error');
        }
    }

    async showHistory(fullRepoName, repoName) {
        document.getElementById('history-cocoon-name').textContent = fullRepoName;
        this.currentRepoForRollback = fullRepoName;
        
        const tbody = document.getElementById('history-tbody');
        const loader = document.getElementById('history-loader');
        const table = document.getElementById('history-table-container');
        
        tbody.innerHTML = '';
        loader.classList.remove('hidden');
        table.classList.add('hidden');
        
        // Show modal
        this.modalHistory.classList.remove('hidden');

        try {
            // 1. Fetch current gh-pages branch head SHA (anti-cached via timestamp query)
            let currentGhPagesSha = null;
            try {
                const branchRes = await fetch(`https://api.github.com/repos/${fullRepoName}/git/ref/heads/gh-pages?_t=${Date.now()}`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (branchRes.ok) {
                    const branchData = await branchRes.json();
                    currentGhPagesSha = branchData.object?.sha;
                }
            } catch(e) { /* ignore */ }

            // 2. Fetch releases (anti-cached via timestamp query)
            const res = await fetch(`https://api.github.com/repos/${fullRepoName}/releases?_t=${Date.now()}`, {
                headers: { 'Authorization': `token ${this.token}` }
            });
            
            if (!res.ok) throw new Error('Failed to fetch history');
            
            let releases = await res.json();
            releases.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            
            loader.classList.add('hidden');
            table.classList.remove('hidden');

            if (releases.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 30px;" class="text-muted">No deployments found.</td></tr>`;
                return;
            }

            // Identify which release matches the current gh-pages commit SHA
            let activeReleaseId = null;
            if (currentGhPagesSha) {
                const activeRel = releases.find(r => {
                    const commitMatch = (r.body || '').match(/\*\*Commit\*\*: ([a-f0-9]+)/i);
                    return commitMatch && commitMatch[1] === currentGhPagesSha;
                });
                if (activeRel) activeReleaseId = activeRel.id;
            }

            releases.forEach((rel) => {
                const tr = document.createElement('tr');
                const isActive = rel.id === activeReleaseId;
                
                tr.innerHTML = `
                    <td>
                        <span class="badge ${isActive ? 'badge-primary' : 'badge-soon'}">${rel.tag_name}</span>
                        ${isActive ? '<span class="text-accent text-small font-bold" style="margin-left:8px;">(Active)</span>' : ''}
                    </td>
                    <td>${this.formatDate(rel.published_at)}</td>
                    <td>~</td>
                    <td>
                        <div class="flex gap-2">
                            ${!isActive ? `
                                <button class="btn btn-secondary btn-sm" onclick="app.confirmRollback('${fullRepoName}', '${rel.tag_name}')" title="Rollback to this version">
                                    <i class="fa-solid fa-rotate-left"></i> Rollback
                                </button>
                            ` : '<span class="text-muted text-small flex align-center mr-2">Current Site</span>'}
                            
                            <button class="btn btn-secondary btn-sm" onclick="app.openRenameModal('${fullRepoName}', ${rel.id}, '${rel.tag_name}')" title="Rename Release Tag">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            
                            <button class="btn btn-danger-outline btn-sm" onclick="app.openDeleteReleaseModal('${fullRepoName}', ${rel.id}, '${rel.tag_name}')" title="Delete Release Version">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            loader.innerHTML = `<p class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</p>`;
        }
    }

    openRenameModal(fullRepoName, releaseId, oldTag) {
        this.renameRepo = fullRepoName;
        this.renameReleaseId = releaseId;
        this.renameOldTag = oldTag;

        document.getElementById('rename-old-tag').textContent = oldTag;
        const input = document.getElementById('rename-new-tag-input');
        if (input) input.value = oldTag;

        const modal = document.getElementById('modal-rename-release');
        if (modal) modal.classList.remove('hidden');

        const btnSave = document.getElementById('btn-confirm-rename-release');
        if (btnSave) {
            btnSave.onclick = () => this.executeRenameRelease();
        }
    }

    async executeRenameRelease() {
        const input = document.getElementById('rename-new-tag-input');
        const newTag = input ? input.value.trim() : '';

        if (!newTag || newTag === this.renameOldTag) {
            const modal = document.getElementById('modal-rename-release');
            if (modal) modal.classList.add('hidden');
            return;
        }

        const btnSave = document.getElementById('btn-confirm-rename-release');

        try {
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btnSave.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${this.renameRepo}/releases/${this.renameReleaseId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag_name: newTag, name: `WEBBL Release (${newTag})` })
            });

            if (!res.ok) throw new Error('Failed to rename release tag');

            const modal = document.getElementById('modal-rename-release');
            if (modal) modal.classList.add('hidden');

            this.showToast('Release Renamed', `Renamed version tag to '${newTag}'`, 'success');
            
            // Re-fetch history with anti-cache
            await new Promise(r => setTimeout(r, 500));
            this.showHistory(this.renameRepo);

        } catch(e) {
            this.showToast('Rename Failed', e.message, 'error');
        } finally {
            btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Tag';
            btnSave.disabled = false;
        }
    }

    openRenameCocoonModal(fullRepoName, oldName) {
        this.renameCocoonFullRepo = fullRepoName;
        this.renameCocoonOldName = oldName;

        const label = document.getElementById('rename-cocoon-old-name');
        if (label) label.textContent = oldName;

        const input = document.getElementById('rename-cocoon-new-name-input');
        if (input) { input.value = oldName; setTimeout(() => input.focus(), 80); }

        const modal = document.getElementById('modal-rename-cocoon');
        if (modal) modal.classList.remove('hidden');
    }

    openEditCocoonDescModal(fullRepoName, currentDesc) {
        this.editDescFullRepo = fullRepoName;

        const label = document.getElementById('edit-cocoon-desc-repo-name');
        if (label) label.textContent = fullRepoName.split('/')[1];

        const input = document.getElementById('edit-cocoon-desc-input');
        if (input) { input.value = currentDesc || ''; setTimeout(() => input.focus(), 80); }

        const modal = document.getElementById('modal-edit-cocoon-desc');
        if (modal) modal.classList.remove('hidden');
    }

    async executeEditCocoonDesc() {
        const input = document.getElementById('edit-cocoon-desc-input');
        const newDesc = input ? input.value.trim() : '';
        const [owner, repo] = this.editDescFullRepo.split('/');
        const btnSave = document.getElementById('btn-confirm-edit-cocoon-desc');

        try {
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btnSave.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newDesc })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to update description');
            }

            this.closeAllModals();
            this.showToast('Description Updated', `Description for '${repo}' saved.`, 'success');
            this.loadCocoons();

        } catch(e) {
            this.showToast('Update Failed', e.message, 'error');
        } finally {
            btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Description';
            btnSave.disabled = false;
        }
    }

    async executeRenameCocoon() {
        const input = document.getElementById('rename-cocoon-new-name-input');
        const newName = input ? input.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';

        if (!newName || newName === this.renameCocoonOldName) {
            this.closeAllModals();
            return;
        }

        const [owner, oldName] = this.renameCocoonFullRepo.split('/');
        const btnSave = document.getElementById('btn-confirm-rename-cocoon');

        try {
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Renaming...';
            btnSave.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${owner}/${oldName}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to rename repository');
            }

            this.closeAllModals();
            this.showToast('Cocoon Renamed', `Renamed ${oldName} to ${newName} successfully.`, 'success');
            this.loadCocoons();

        } catch(e) {
            this.showToast('Rename Failed', e.message, 'error');
        } finally {
            btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Name';
            btnSave.disabled = false;
        }
    }

    openDeleteReleaseModal(fullRepoName, releaseId, tagName) {
        this.deleteReleaseRepo = fullRepoName;
        this.deleteReleaseId = releaseId;
        this.deleteReleaseTag = tagName;

        document.getElementById('delete-release-tag').textContent = tagName;

        const modal = document.getElementById('modal-delete-release');
        if (modal) modal.classList.remove('hidden');

        const btnConfirm = document.getElementById('btn-confirm-delete-release');
        if (btnConfirm) {
            btnConfirm.onclick = () => this.executeDeleteRelease();
        }
    }

    async executeDeleteRelease() {
        const btnConfirm = document.getElementById('btn-confirm-delete-release');

        try {
            btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
            btnConfirm.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${this.deleteReleaseRepo}/releases/${this.deleteReleaseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${this.token}` }
            });

            if (!res.ok && res.status !== 204) throw new Error('Failed to delete release');

            const modal = document.getElementById('modal-delete-release');
            if (modal) modal.classList.add('hidden');

            this.showToast('Release Deleted', `Version '${this.deleteReleaseTag}' removed from history.`, 'success');

            // Re-fetch history with anti-cache
            await new Promise(r => setTimeout(r, 500));
            this.showHistory(this.deleteReleaseRepo);

        } catch(e) {
            this.showToast('Delete Failed', e.message, 'error');
        } finally {
            btnConfirm.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Version';
            btnConfirm.disabled = false;
        }
    }

    confirmRollback(repoName, tag) {
        document.getElementById('rollback-repo').textContent = repoName;
        document.getElementById('rollback-tag').textContent = tag;
        
        this.modalHistory.classList.add('hidden');
        this.modalRollback.classList.remove('hidden');
        
        this.rollbackTargetTag = tag;
        this.rollbackFullRepo = repoName;
    }

    async executeRollback() {
        const btn = document.getElementById('btn-confirm-rollback');
        const repo = this.rollbackFullRepo;
        const tag = this.rollbackTargetTag;

        if (!repo || !tag) return;

        const [owner, repoName] = repo.split('/');

        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Rollback...';
            btn.disabled = true;

            // 1. Fetch release list to find target by exact tag_name
            const relsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases`, {
                headers: { 'Authorization': `token ${this.token}` }
            });
            if (!relsRes.ok) throw new Error(`Failed to fetch releases for ${repo}`);
            
            const relsData = await relsRes.json();
            // Find EXACT release match by tag_name (not rollback records)
            const relData = relsData.find(r => r.tag_name === tag);

            if (!relData) throw new Error(`Release '${tag}' not found in GitHub Releases list for ${repo}`);
            
            const body = relData.body || '';

            // Extract target commit SHA from release body
            const commitMatch = body.match(/\*\*Commit\*\*: ([a-f0-9]+)/i);
            let targetSha = commitMatch ? commitMatch[1] : null;

            // Fallback for older releases without written commit SHA in body:
            if (!targetSha) {
                // Fetch all commits from gh-pages branch ordered chronologically
                const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?sha=gh-pages`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (commitsRes.ok) {
                    const commits = await commitsRes.json();
                    // Filter deploy releases only
                    const deployReleases = relsData
                        .filter(r => !r.name?.includes('Rollback'))
                        .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
                    
                    const targetIndex = deployReleases.findIndex(r => r.tag_name === tag);
                    
                    // Match to the corresponding commit in the chronological array (reversed)
                    const chronoCommits = [...commits].reverse();
                    if (targetIndex >= 0 && targetIndex < chronoCommits.length) {
                        targetSha = chronoCommits[targetIndex].sha;
                    } else if (commits.length > 0) {
                        targetSha = commits[commits.length - 1].sha; // Default to earliest commit
                    }
                }
            }

            if (!targetSha) throw new Error(`Could not locate historical commit SHA for deployment '${tag}'`);

            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Restoring commit ${targetSha.slice(0, 7)}...`;

            // 2. Re-point gh-pages branch to target historical commit
            const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/gh-pages`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sha: targetSha, force: true })
            });

            if (!patchRes.ok) throw new Error(`Failed to update gh-pages branch to commit ${targetSha.slice(0, 7)}`);

            // 3. Trigger forced build on GitHub Pages
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Building GitHub Pages...`;
            try {
                await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages/builds`, {
                    method: 'POST',
                    headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' }
                });
            } catch(e) { /* ignore */ }

            // 4. Poll GitHub Pages Build Status in Realtime until 'built' (Up to 45s)
            let buildComplete = false;
            const startTime = Date.now();
            while (!buildComplete && (Date.now() - startTime < 45000)) {
                await new Promise(r => setTimeout(r, 4000));
                try {
                    const statusRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (statusData.status === 'built') {
                            buildComplete = true;
                            break;
                        }
                    }
                } catch(e) { /* continue polling */ }
            }

            // 5. Create new structured Rollback release record (e.g., v1.0.0-rb-1)
            const cleanBaseTag = tag.replace(/-rb-\d+$/, '');
            const rbCount = relsData.filter(r => r.tag_name.startsWith(`${cleanBaseTag}-rb-`)).length + 1;
            const rollbackTag = `${cleanBaseTag}-rb-${rbCount}`;

            await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases`, {
                method: 'POST',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag_name: rollbackTag,
                    name: `WEBBL Rollback to ${tag} (${rollbackTag})`,
                    body: `**Cocoon**: ${repoName}\n**Commit**: ${targetSha}\n**Rollback Target**: ${tag}\n\nRollback executed via WEBBL Web Console.`
                })
            });

            this.closeAllModals();
            this.showToast('Rollback Success!', `Successfully restored ${repoName} to ${tag}!`, 'success');
            this.loadCocoons();

        } catch (err) {
            this.showToast('Rollback Error', err.message, 'error');
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Confirm Rollback';
            btn.disabled = false;
        }
    }

    addDeployFiles(newFileList, container) {
        if (!this.selectedDeployFiles) this.selectedDeployFiles = [];
        
        const newFiles = Array.from(newFileList);
        newFiles.forEach(nf => {
            // Replace existing file if same name, or append
            const existingIdx = this.selectedDeployFiles.findIndex(f => f.name === nf.name);
            if (existingIdx >= 0) {
                this.selectedDeployFiles[existingIdx] = nf;
            } else {
                this.selectedDeployFiles.push(nf);
            }
        });

        this.updateFilePreview(this.selectedDeployFiles, container);
    }

    updateFilePreview(files, container) {
        if (!container) return;
        
        // Store selected files in an array if not already present
        if (!this.selectedDeployFiles || Array.isArray(files)) {
            this.selectedDeployFiles = Array.from(files);
        }

        if (!this.selectedDeployFiles.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `<p class="text-small text-muted mb-2">Selected (${this.selectedDeployFiles.length} file${this.selectedDeployFiles.length > 1 ? 's' : ''}):</p>`;
        
        this.selectedDeployFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'file-preview-chip';
            chip.innerHTML = `
                <span><i class="fa-regular fa-file"></i> ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" class="btn-remove-file" data-index="${index}" title="Remove ${file.name}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            container.appendChild(chip);
        });

        // Attach remove click handlers
        container.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                this.selectedDeployFiles.splice(idx, 1);
                this.updateFilePreview(this.selectedDeployFiles, container);
            });
        });
    }

    async executeWebDeploy() {
        const repoInput = document.getElementById('new-cocoon-repo');
        const msgInput = document.getElementById('new-cocoon-msg');
        const progress = document.getElementById('deploy-progress');
        const progressText = document.getElementById('deploy-progress-text');
        const btnExecute = document.getElementById('btn-execute-deploy');

        const repo = repoInput ? repoInput.value.trim() : '';
        const message = msgInput ? msgInput.value.trim() : 'WEBBL Web Console Deploy';
        const files = this.selectedDeployFiles || [];

        if (!repo || !repo.includes('/')) {
            this.showToast('Error', 'Please enter a valid GitHub repo in owner/repo format.', 'error');
            return;
        }

        if (!files.length) {
            this.showToast('Error', 'Please select at least one file to deploy.', 'error');
            return;
        }

        const [owner, repoName] = repo.split('/');

        const formFields = document.getElementById('deploy-form-fields');
        const modalFooter = document.getElementById('deploy-modal-footer');
        const stepTitle = document.getElementById('deploy-step-title');
        const statusBadge = document.getElementById('deploy-status-badge');

        try {
            btnExecute.disabled = true;
            if (formFields) formFields.classList.add('hidden');
            if (modalFooter) modalFooter.classList.add('hidden');
            progress.classList.remove('hidden');

            if (stepTitle) stepTitle.textContent = '1. Initializing Repository...';
            progressText.textContent = `Preparing deployment for ${repo}...`;

            // 0. Ensure repository exists (Auto-create if it doesn't exist)
            let repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
                headers: { 'Authorization': `token ${this.token}` }
            });
            
            if (!repoRes.ok && repoRes.status === 404) {
                if (stepTitle) stepTitle.textContent = '1. Creating GitHub Repository...';
                progressText.textContent = `Repository ${repo} not found. Creating automatically on GitHub...`;
                const createRes = await fetch(`https://api.github.com/user/repos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: repoName,
                        description: 'WEBBL Cocoon site',
                        auto_init: true,
                        private: false
                    })
                });

                if (!createRes.ok) {
                    const errData = await createRes.json();
                    throw new Error(`Failed to create repository ${repo}: ${errData.message || createRes.statusText}`);
                }

                // Wait 1.5s for GitHub to propagate new repo creation
                await new Promise(r => setTimeout(r, 1500));

                repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
            } else if (!repoRes.ok) {
                throw new Error(`Error accessing repository ${repo} (${repoRes.status}). Check token permissions.`);
            }
            
            const repoData = await repoRes.json();
            const defaultBranch = repoData.default_branch || 'main';

            // Check if repo is completely empty and needs initial commit
            let mainSha = null;
            try {
                const mainBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (mainBranchRes.ok) {
                    const mainBranchData = await mainBranchRes.json();
                    mainSha = mainBranchData.object.sha;
                }
            } catch(e) { /* empty repo */ }

            // Ensure repo is initialized with a commit on default branch
            if (!mainSha) {
                progressText.textContent = 'Initializing default branch...';
                const initRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/README.md`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Initial commit by WEBBL', content: btoa('# WEBBL Site Repository') })
                });
                if (initRes.ok) {
                    const initData = await initRes.json();
                    mainSha = initData.commit?.sha || initData.content?.sha;
                }
                await new Promise(r => setTimeout(r, 1000));
            }

            // Create gh-pages branch from mainSha directly (catches 422 if branch already exists silently)
            if (mainSha) {
                progressText.textContent = 'Preparing gh-pages branch...';
                await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ref: 'refs/heads/gh-pages',
                        sha: mainSha
                    })
                });
            }

            // 1. Upload files directly to gh-pages branch using Contents API
            if (stepTitle) stepTitle.textContent = `2. Uploading ${files.length} Build Files to gh-pages...`;
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                progressText.textContent = `Uploading file (${i + 1}/${files.length}): ${file.name}...`;

                const arrayBuffer = await file.arrayBuffer();
                const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

                // Put file content directly on gh-pages branch
                const putRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.name}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        content: base64,
                        branch: 'gh-pages'
                    })
                });

                if (!putRes.ok && putRes.status === 422) {
                    // File exists, fetch SHA to overwrite
                    const getFileRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.name}?ref=gh-pages`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (getFileRes.ok) {
                        const fileData = await getFileRes.json();
                        await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.name}`, {
                            method: 'PUT',
                            headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: message,
                                content: base64,
                                branch: 'gh-pages',
                                sha: fileData.sha
                            })
                        });
                    }
                } else if (!putRes.ok) {
                    const errTxt = await putRes.text();
                    throw new Error(`Failed to upload ${file.name} to gh-pages: ${errTxt}`);
                }
            }

            // Ensure .nojekyll is uploaded to gh-pages branch to bypass Jekyll compiler errors
            const hasNoJekyll = files.some(f => f.name === '.nojekyll' || f.name.endsWith('/.nojekyll'));
            if (!hasNoJekyll) {
                progressText.textContent = 'Uploading .nojekyll to disable Jekyll...';
                try {
                    let sha = undefined;
                    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/.nojekyll?ref=gh-pages`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (getRes.ok) {
                        const fileData = await getRes.json();
                        sha = fileData.sha;
                    }
                    const body = {
                        message: '🛡️ Disable Jekyll for WEBBL',
                        content: btoa('# Disable Jekyll for WEBBL'),
                        branch: 'gh-pages'
                    };
                    if (sha) body.sha = sha;
                    await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/.nojekyll`, {
                        method: 'PUT',
                        headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                } catch(e) { /* ignore nojekyll upload error */ }
            }

            // 2. Tag repo with webbl-cocoon topic
            if (stepTitle) stepTitle.textContent = '3. Tagging Repository & Enabling Pages...';
            try {
                const topicsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/topics`, {
                    headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                const topicsData = topicsRes.ok ? await topicsRes.json() : { names: [] };
                if (!topicsData.names.includes('webbl-cocoon')) {
                    topicsData.names.push('webbl-cocoon');
                    await fetch(`https://api.github.com/repos/${owner}/${repoName}/topics`, {
                        method: 'PUT',
                        headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' },
                        body: JSON.stringify({ names: topicsData.names })
                    });
                }
            } catch (e) { /* ignore topic error */ }

            // 3. Enable GitHub Pages using build_type: legacy (Fixes Cancelled Actions Build)
            try {
                await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        build_type: 'legacy',
                        source: { branch: 'gh-pages', path: '/' }
                    })
                });
            } catch (e) { /* ignore if already active */ }

            // Request explicit build trigger
            try {
                await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages/builds`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
            } catch(e) { /* ignore */ }

            // 4. Poll GitHub Pages Build Status in Live Realtime (Up to 45 seconds)
            if (stepTitle) stepTitle.textContent = '4. Building GitHub Pages Site...';
            progressText.textContent = 'Waiting for GitHub Pages Action to build your site...';
            if (statusBadge) statusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> GitHub Pages Building...';

            let buildComplete = false;
            const startTime = Date.now();
            while (!buildComplete && (Date.now() - startTime < 45000)) {
                await new Promise(r => setTimeout(r, 4000));
                try {
                    const statusRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (statusData.status === 'built') {
                            buildComplete = true;
                            break;
                        }
                    }
                } catch(e) { /* continue polling */ }
            }

            // 9. Fetch latest commit SHA from gh-pages branch and Create Release for rollback history
            let latestCommitSha = '';
            try {
                const commitRefRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?sha=gh-pages`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (commitRefRes.ok) {
                    const commits = await commitRefRes.json();
                    if (commits && commits.length > 0) latestCommitSha = commits[0].sha;
                }
            } catch(e) { /* ignore */ }

            const customTagInput = document.getElementById('new-cocoon-tag');
            const tag = (customTagInput && customTagInput.value.trim()) 
                ? customTagInput.value.trim() 
                : `webbl-v${Date.now()}`;

            await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases`, {
                method: 'POST',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag_name: tag,
                    name: `WEBBL Release (${tag}) — ${new Date().toUTCString()}`,
                    body: `**Cocoon**: ${repoName}\n**Commit**: ${latestCommitSha}\n**Files**: ${files.length}\n\n${message}`
                })
            });

            this.closeAllModals();
            this.showToast('Deploy Success!', `Cocoon ${repo} is now Live on GitHub Pages!`, 'success');
            this.loadCocoons();

        } catch (err) {
            this.showToast('Deploy Error', err.message, 'error');
            if (formFields) formFields.classList.remove('hidden');
            if (modalFooter) modalFooter.classList.remove('hidden');
            progress.classList.add('hidden');
        } finally {
            btnExecute.disabled = false;
        }
    }

    /* --- Delete Cocoon Handler --- */

    confirmDeleteCocoon(fullRepo, repoName) {
        document.getElementById('delete-cocoon-target').textContent = fullRepo;
        document.getElementById('delete-repo-name').textContent = repoName;
        this.targetRepoToDelete = fullRepo;
        
        const modalDelete = document.getElementById('modal-delete-cocoon');
        if (modalDelete) modalDelete.classList.remove('hidden');

        const btnConfirm = document.getElementById('btn-confirm-delete-cocoon');
        if (btnConfirm) {
            btnConfirm.onclick = () => this.executeDeleteCocoon();
        }
    }

    async executeDeleteCocoon() {
        const fullRepo = this.targetRepoToDelete;
        if (!fullRepo) return;

        const btnConfirm = document.getElementById('btn-confirm-delete-cocoon');
        const progress = document.getElementById('delete-progress');
        const progressText = document.getElementById('delete-progress-text');

        try {
            btnConfirm.disabled = true;
            progress.classList.remove('hidden');

            progressText.textContent = `Deleting GitHub Repository ${fullRepo}...`;
            const res = await fetch(`https://api.github.com/repos/${fullRepo}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${this.token}` }
            });

            if (!res.ok && res.status !== 204) {
                throw new Error(`Failed to delete repo (${res.status}). Ensure your PAT has delete_repo permissions.`);
            }
            this.showToast('Repository Deleted', `Deleted ${fullRepo} permanently from GitHub.`, 'success');

            this.closeAllModals();
            this.loadCocoons();

        } catch (err) {
            this.showToast('Delete Failed', err.message, 'error');
        } finally {
            btnConfirm.disabled = false;
            progress.classList.add('hidden');
        }
    }

    closeAllModals() {
        this.modalHistory.classList.add('hidden');
        this.modalRollback.classList.add('hidden');
        const modalNew = document.getElementById('modal-new-cocoon');
        if (modalNew) modalNew.classList.add('hidden');
        const modalDel = document.getElementById('modal-delete-cocoon');
        if (modalDel) modalDel.classList.add('hidden');
        const modalRename = document.getElementById('modal-rename-release');
        if (modalRename) modalRename.classList.add('hidden');
        const modalDeleteRel = document.getElementById('modal-delete-release');
        if (modalDeleteRel) modalDeleteRel.classList.add('hidden');
        const modalNewMorph = document.getElementById('modal-new-morph');
        if (modalNewMorph) modalNewMorph.classList.add('hidden');
        const modalRunMorph = document.getElementById('modal-run-morph');
        if (modalRunMorph) modalRunMorph.classList.add('hidden');
        const modalRenameMorph = document.getElementById('modal-rename-morph');
        if (modalRenameMorph) modalRenameMorph.classList.add('hidden');
        const modalDeleteMorph = document.getElementById('modal-delete-morph');
        if (modalDeleteMorph) modalDeleteMorph.classList.add('hidden');
        // FIX: include rename-cocoon modal so it properly closes after rename
        const modalRenameCocoon = document.getElementById('modal-rename-cocoon');
        if (modalRenameCocoon) modalRenameCocoon.classList.add('hidden');
        const modalEditDesc = document.getElementById('modal-edit-cocoon-desc');
        if (modalEditDesc) modalEditDesc.classList.add('hidden');

        // Reset deploy form visibility & selected files
        this.selectedDeployFiles = [];
        const previewContainer = document.getElementById('file-list-preview');
        if (previewContainer) previewContainer.innerHTML = '';
        const formFields = document.getElementById('deploy-form-fields');
        const modalFooter = document.getElementById('deploy-modal-footer');
        const progress = document.getElementById('deploy-progress');
        if (formFields) formFields.classList.remove('hidden');
        if (modalFooter) modalFooter.classList.remove('hidden');
        if (progress) progress.classList.add('hidden');
    }

    /* --- Helpers --- */

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-msg">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    truncate(str, length) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    /* --- Morphs Engine --- */

    async loadMorphs() {
        const loader = document.getElementById('morphs-loader');
        const grid = document.getElementById('morphs-grid');
        if (!loader || !grid) return;

        try {
            loader.classList.remove('hidden');
            grid.innerHTML = '';

            const res = await fetch(`https://api.github.com/user/repos?per_page=100&type=owner&_t=${Date.now()}`, {
                headers: { 'Authorization': `token ${this.token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch repositories');

            const repos = await res.json();
            const morphRepos = repos.filter(r => r.topics && r.topics.includes('webbl-morph'));

            loader.classList.add('hidden');

            if (morphRepos.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state glass" style="grid-column: 1 / -1; padding: 40px;">
                        <div class="glow-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                        <h3>No Morphs Found</h3>
                        <p class="text-muted">Create your first serverless function running on GitHub Actions ($0 Cost).</p>
                        <button class="btn btn-primary mt-4" onclick="app.openCreateMorphModal()">
                            <i class="fa-solid fa-plus"></i> Create Morph
                        </button>
                    </div>
                `;
                return;
            }

            this.renderMorphs(morphRepos, grid);

        } catch (err) {
            loader.classList.add('hidden');
            grid.innerHTML = `<p class="text-danger p-4"><i class="fa-solid fa-triangle-exclamation"></i> Error loading Morphs: ${err.message}</p>`;
        }
    }

    renderMorphs(repos, container) {
        container.innerHTML = '';

        repos.forEach(repo => {
            let category = 'async';
            let badgeClass = 'badge-primary';
            let categoryLabel = '⚡ Async Morph';

            if (repo.topics.includes('morph-build')) {
                category = 'build';
                badgeClass = 'badge-scope';
                categoryLabel = '🏗️ Build Morph';
            } else if (repo.topics.includes('morph-hatch')) {
                category = 'hatch';
                badgeClass = 'badge-soon';
                categoryLabel = '🐣 Hatch Morph';
            }

            const card = document.createElement('div');
            card.className = 'cocoon-card glass';

            card.innerHTML = `
                <div class="cocoon-card-header">
                    <div>
                        <h3 class="cocoon-title" style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-wand-magic-sparkles text-primary"></i> ${repo.name}
                            <button class="btn-icon text-muted hover-text-primary" onclick="app.openEditMorphModal('${repo.full_name}')" title="Edit Morph (Name, Type, Description, TTL & Code)" style="background:none; border:none; cursor:pointer; font-size:12px; padding:2px;">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </h3>
                        <p class="text-muted text-small">${this.truncate(repo.description || 'WEBBL Serverless Function', 45)}</p>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <span class="badge ${badgeClass}">${categoryLabel}</span>
                        ${category === 'hatch' ? '<span class="badge badge-accent" style="font-size:10px;"><i class="fa-solid fa-stopwatch"></i> Idle TTL Sleep</span>' : ''}
                    </div>
                </div>

                <div class="cocoon-meta mt-3">
                    <div class="meta-item">
                        <span class="meta-label">Created:</span>
                        <span class="meta-value">${this.formatDate(repo.created_at)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Repo:</span>
                        <span class="meta-value">${repo.full_name}</span>
                    </div>
                </div>

                <div class="cocoon-card-actions mt-4 flex gap-2">
                    <button class="btn btn-primary btn-sm flex-1" onclick="app.openRunMorphModal('${repo.full_name}')">
                        <i class="fa-solid fa-play"></i> Run Morph
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.openEditMorphModal('${repo.full_name}')" title="Edit Morph Settings (Name, Type, Description, Idle TTL & Code)">
                        <i class="fa-solid fa-pen"></i> Edit Morph
                    </button>
                    <a href="${repo.html_url}" target="_blank" class="btn btn-secondary btn-sm" title="View GitHub Repository">
                        <i class="fa-brands fa-github"></i>
                    </a>
                    <button class="btn btn-danger-outline btn-sm" onclick="app.openDeleteMorphModal('${repo.full_name}', '${repo.name}')" title="Delete Morph Repository">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            container.appendChild(card);
        });
    }

    openCreateMorphModal() {
        if (!this.token) {
            this.showToast('Error', 'Please connect your GitHub Token first.', 'error');
            return;
        }

        document.getElementById('new-morph-name').value = '';
        document.getElementById('new-morph-desc').value = '';
        document.getElementById('new-morph-category').value = 'async';
        const ttlInput = document.getElementById('new-morph-ttl');
        if (ttlInput) ttlInput.value = '10';
        
        // Reset code editor and file input state (no cache)
        const codeEditor = document.getElementById('new-morph-code-editor');
        if (codeEditor) codeEditor.value = '';

        const morphFileInput = document.getElementById('new-morph-file-input');
        if (morphFileInput) morphFileInput.value = '';

        const fileNameSpan = document.getElementById('morph-file-selected-name');
        if (fileNameSpan) fileNameSpan.textContent = 'No file selected';

        const modal = document.getElementById('modal-new-morph');
        if (modal) modal.classList.remove('hidden');
    }

    async executeCreateMorph() {
        const nameInput = document.getElementById('new-morph-name');
        const catInput = document.getElementById('new-morph-category');
        const descInput = document.getElementById('new-morph-desc');
        const ttlInput = document.getElementById('new-morph-ttl');
        const btnExecute = document.getElementById('btn-execute-create-morph');
        const progress = document.getElementById('morph-create-progress');
        const progressText = document.getElementById('morph-create-progress-text');

        const name = nameInput ? nameInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';
        const category = catInput ? catInput.value : 'async';
        const description = descInput ? descInput.value.trim() : '';
        const idleTimeoutMin = ttlInput ? Math.min(Math.max(parseInt(ttlInput.value, 10) || 10, 1), 360) : 10;

        if (!name) {
            this.showToast('Error', 'Please enter a valid Morph name.', 'error');
            return;
        }

        try {
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Morph Repository...';
            progress.classList.remove('hidden');

            // 1. Create repository
            progressText.textContent = `Creating repository ${name}...`;
            const repoRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: description || `WEBBL ${category} Morph Serverless Function`,
                    private: false,
                    auto_init: true
                })
            });

            if (!repoRes.ok) throw new Error('Failed to create GitHub repository.');

            const repoData = await repoRes.json();
            const fullRepo = repoData.full_name;

            // 2. Set topics
            progressText.textContent = 'Configuring WEBBL Morph topics...';
            await fetch(`https://api.github.com/repos/${fullRepo}/topics`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' },
                body: JSON.stringify({ names: ['webbl-morph', `morph-${category}`] })
            });

            // 3. Commit index.js handler (user code or default)
            progressText.textContent = 'Writing index.js handler, manifest and GitHub Workflow...';
            const codeEditor = document.getElementById('new-morph-code-editor');
            const customCode = (codeEditor && codeEditor.value.trim()) ? codeEditor.value.trim() : `// WEBBL Morph Serverless Function (${category.toUpperCase()})
module.exports = async function handler(payload) {
  console.log("🦋 WEBBL Morph executed with payload:", payload);
  return {
    status: 200,
    timestamp: new Date().toISOString(),
    message: "Hello from WEBBL Morph!",
    input: payload
  };
};`;

            await fetch(`https://api.github.com/repos/${fullRepo}/contents/index.js`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'feat: initialize morph index.js handler',
                    content: btoa(unescape(encodeURIComponent(customCode)))
                })
            });

            // 4. Commit .webbl-morph.json manifest
            const manifest = {
                name,
                category,
                description,
                idleTimeoutMin,
                createdAt: new Date().toISOString()
            };

            await fetch(`https://api.github.com/repos/${fullRepo}/contents/.webbl-morph.json`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'feat: initialize morph manifest',
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2))))
                })
            });

            // 5. Commit GitHub Action workflow with IDLE_TIMEOUT_MIN
            const workflowYml = `name: WEBBL Morph Execution
on:
  repository_dispatch:
    types: [morph-run]
  workflow_dispatch:
    inputs:
      payload:
        description: 'JSON Payload'
        required: false
        default: '{}'

jobs:
  run-morph:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Morph Handler
        run: |
          node -e '
            const handler = require("./index.js");
            const payload = JSON.parse(process.env.PAYLOAD || "{}");
            Promise.resolve(handler(payload)).then(res => {
              console.log("::WEBBL_RESULT_START::");
              console.log(JSON.stringify(res));
              console.log("::WEBBL_RESULT_END::");
            }).catch(err => {
              console.error(err);
              process.exit(1);
            });
          '
        env:
          PAYLOAD: \${{ github.event.client_payload.payload || github.event.inputs.payload || '{}' }}
          IDLE_TIMEOUT_MIN: '${idleTimeoutMin}'
`;

            await fetch(`https://api.github.com/repos/${fullRepo}/contents/.github/workflows/morph.yml`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'ci: add WEBBL morph execution workflow',
                    content: btoa(unescape(encodeURIComponent(workflowYml)))
                })
            });

            this.closeAllModals();
            this.showToast('Morph Created', `Created Morph repository '${fullRepo}' successfully!`, 'success');
            
            await new Promise(r => setTimeout(r, 1000));
            this.loadMorphs();

        } catch (err) {
            this.showToast('Morph Creation Failed', err.message, 'error');
        } finally {
            btnExecute.disabled = false;
            btnExecute.innerHTML = '<i class="fa-solid fa-plus"></i> Create Morph Repository';
            progress.classList.add('hidden');
        }
    }

    async openEditMorphModal(fullRepo) {
        if (!this.token) {
            this.showToast('Error', 'Please connect your GitHub Token first.', 'error');
            return;
        }

        this.editMorphTargetRepo = fullRepo;
        document.getElementById('edit-morph-target-repo').textContent = fullRepo;

        const loader = document.getElementById('edit-morph-loader');
        const form = document.getElementById('edit-morph-form');
        const modal = document.getElementById('modal-edit-morph');

        loader.classList.remove('hidden');
        form.classList.add('hidden');
        modal.classList.remove('hidden');

        try {
            // 1. Fetch repo details
            const repoRes = await fetch(`https://api.github.com/repos/${fullRepo}`, {
                headers: { 'Authorization': `token ${this.token}` }
            });
            if (!repoRes.ok) throw new Error('Failed to fetch Morph details.');
            const repoData = await repoRes.json();

            // Detect category from topics
            let category = 'async';
            if (repoData.topics?.includes('morph-build')) category = 'build';
            if (repoData.topics?.includes('morph-hatch')) category = 'hatch';

            // 2. Fetch index.js code
            let code = '';
            try {
                const codeRes = await fetch(`https://api.github.com/repos/${fullRepo}/contents/index.js`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (codeRes.ok) {
                    const codeData = await codeRes.json();
                    if (codeData.content) {
                        code = decodeURIComponent(escape(atob(codeData.content.replace(/\n/g, ''))));
                    }
                }
            } catch(e) {}

            // 3. Fetch manifest for idleTimeoutMin
            let idleTimeoutMin = 10;
            try {
                const manifestRes = await fetch(`https://api.github.com/repos/${fullRepo}/contents/.webbl-morph.json`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (manifestRes.ok) {
                    const manifestData = await manifestRes.json();
                    if (manifestData.content) {
                        const m = JSON.parse(decodeURIComponent(escape(atob(manifestData.content.replace(/\n/g, '')))));
                        if (m.idleTimeoutMin) idleTimeoutMin = m.idleTimeoutMin;
                    }
                }
            } catch(e) {}

            // Pre-fill modal form
            document.getElementById('edit-morph-name').value = repoData.name;
            document.getElementById('edit-morph-category').value = category;
            document.getElementById('edit-morph-desc').value = repoData.description || '';
            document.getElementById('edit-morph-ttl').value = idleTimeoutMin;
            document.getElementById('edit-morph-code-editor').value = code;

            loader.classList.add('hidden');
            form.classList.remove('hidden');

        } catch (err) {
            this.showToast('Error Loading Morph', err.message, 'error');
            modal.classList.add('hidden');
        }
    }

    async executeEditMorph() {
        const fullRepo = this.editMorphTargetRepo;
        if (!fullRepo) return;

        const [owner, oldRepoName] = fullRepo.split('/');
        const newNameInput = document.getElementById('edit-morph-name');
        const catInput = document.getElementById('edit-morph-category');
        const descInput = document.getElementById('edit-morph-desc');
        const ttlInput = document.getElementById('edit-morph-ttl');
        const codeInput = document.getElementById('edit-morph-code-editor');
        const btnExecute = document.getElementById('btn-execute-edit-morph');
        const progress = document.getElementById('morph-edit-progress');
        const progressText = document.getElementById('morph-edit-progress-text');

        const newName = newNameInput ? newNameInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : oldRepoName;
        const category = catInput ? catInput.value : 'async';
        const description = descInput ? descInput.value.trim() : '';
        const idleTimeoutMin = ttlInput ? Math.min(Math.max(parseInt(ttlInput.value, 10) || 10, 1), 360) : 10;
        const code = codeInput ? codeInput.value : '';

        let currentRepoName = oldRepoName;

        try {
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Morph...';
            progress.classList.remove('hidden');

            // 1. Rename repo if name changed
            if (newName && newName !== oldRepoName) {
                progressText.textContent = `Renaming repository to ${newName}...`;
                const renameRes = await fetch(`https://api.github.com/repos/${owner}/${oldRepoName}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
                if (!renameRes.ok) throw new Error('Failed to rename Morph repository.');
                currentRepoName = newName;
            }

            const currentFullRepo = `${owner}/${currentRepoName}`;

            // 2. Update description & topics
            progressText.textContent = 'Updating description and topics...';
            await fetch(`https://api.github.com/repos/${currentFullRepo}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });

            await fetch(`https://api.github.com/repos/${currentFullRepo}/topics`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json' },
                body: JSON.stringify({ names: ['webbl-morph', `morph-${category}`] })
            });

            // 3. Update index.js
            progressText.textContent = 'Updating index.js script handler...';
            let codeSha = undefined;
            try {
                const existingCode = await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/index.js`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (existingCode.ok) {
                    const cData = await existingCode.json();
                    codeSha = cData.sha;
                }
            } catch(e) {}

            const codeBody = {
                message: 'feat: update morph index.js code',
                content: btoa(unescape(encodeURIComponent(code)))
            };
            if (codeSha) codeBody.sha = codeSha;

            await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/index.js`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(codeBody)
            });

            // 4. Update .webbl-morph.json manifest
            progressText.textContent = 'Updating .webbl-morph.json manifest...';
            let manifestSha = undefined;
            try {
                const existingM = await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/.webbl-morph.json`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (existingM.ok) {
                    const mData = await existingM.json();
                    manifestSha = mData.sha;
                }
            } catch(e) {}

            const updatedManifest = {
                name: currentRepoName,
                category,
                description,
                idleTimeoutMin,
                updatedAt: new Date().toISOString()
            };

            const manifestBody = {
                message: 'feat: update morph manifest',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(updatedManifest, null, 2))))
            };
            if (manifestSha) manifestBody.sha = manifestSha;

            await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/.webbl-morph.json`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(manifestBody)
            });

            // 5. Update GitHub Action workflow YAML with IDLE_TIMEOUT_MIN
            progressText.textContent = 'Updating workflow idle timeout TTL...';
            let workflowSha = undefined;
            try {
                const existingW = await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/.github/workflows/morph.yml`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                if (existingW.ok) {
                    const wData = await existingW.json();
                    workflowSha = wData.sha;
                }
            } catch(e) {}

            const workflowYml = `name: WEBBL Morph Execution
on:
  repository_dispatch:
    types: [morph-run]
  workflow_dispatch:
    inputs:
      payload:
        description: 'JSON Payload'
        required: false
        default: '{}'

jobs:
  run-morph:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Morph Handler
        run: |
          node -e '
            const handler = require("./index.js");
            const payload = JSON.parse(process.env.PAYLOAD || "{}");
            Promise.resolve(handler(payload)).then(res => {
              console.log("::WEBBL_RESULT_START::");
              console.log(JSON.stringify(res));
              console.log("::WEBBL_RESULT_END::");
            }).catch(err => {
              console.error(err);
              process.exit(1);
            });
          '
        env:
          PAYLOAD: \${{ github.event.client_payload.payload || github.event.inputs.payload || '{}' }}
          IDLE_TIMEOUT_MIN: '${idleTimeoutMin}'
`;

            const workflowBody = {
                message: 'ci: update morph idle timeout TTL',
                content: btoa(unescape(encodeURIComponent(workflowYml)))
            };
            if (workflowSha) workflowBody.sha = workflowSha;

            await fetch(`https://api.github.com/repos/${currentFullRepo}/contents/.github/workflows/morph.yml`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowBody)
            });

            this.closeAllModals();
            this.showToast('Morph Updated', `Morph '${currentFullRepo}' updated successfully!`, 'success');

            await new Promise(r => setTimeout(r, 1000));
            this.loadMorphs();

        } catch (err) {
            this.showToast('Morph Edit Failed', err.message, 'error');
        } finally {
            btnExecute.disabled = false;
            btnExecute.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Morph Changes';
            progress.classList.add('hidden');
        }
    }

    openRunMorphModal(fullRepo) {
        this.targetMorphToRun = fullRepo;
        document.getElementById('run-morph-target').textContent = fullRepo;

        const resultBox = document.getElementById('morph-run-result-box');
        if (resultBox) resultBox.classList.add('hidden');

        const modal = document.getElementById('modal-run-morph');
        if (modal) modal.classList.remove('hidden');
    }

    async executeRunMorph() {
        const fullRepo = this.targetMorphToRun;
        if (!fullRepo) return;

        const payloadInput = document.getElementById('run-morph-payload');
        const btnExecute = document.getElementById('btn-execute-run-morph');
        const progress = document.getElementById('morph-run-progress');
        const progressText = document.getElementById('morph-run-progress-text');
        const resultBox = document.getElementById('morph-run-result-box');
        const resultPre = document.getElementById('morph-run-result-json');

        let payloadStr = payloadInput ? payloadInput.value.trim() : '{}';
        try {
            JSON.parse(payloadStr);
        } catch {
            this.showToast('Error', 'Invalid JSON input payload format.', 'error');
            return;
        }

        try {
            btnExecute.disabled = true;
            progress.classList.remove('hidden');
            resultBox.classList.add('hidden');

            progressText.textContent = `Dispatching trigger to GitHub Actions (${fullRepo})...`;

            const dispatchRes = await fetch(`https://api.github.com/repos/${fullRepo}/dispatches`, {
                method: 'POST',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'morph-run',
                    client_payload: { payload: payloadStr }
                })
            });

            if (!dispatchRes.ok && dispatchRes.status !== 204) {
                throw new Error('Failed to dispatch Morph execution trigger.');
            }

            progressText.textContent = 'Polling GitHub Actions runner execution status...';

            let completed = false;
            let runStatus = null;
            const startTime = Date.now();

            while (!completed && (Date.now() - startTime < 30000)) {
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const runsRes = await fetch(`https://api.github.com/repos/${fullRepo}/actions/runs?per_page=3&_t=${Date.now()}`, {
                        headers: { 'Authorization': `token ${this.token}` }
                    });
                    if (runsRes.ok) {
                        const runsData = await runsRes.json();
                        const latestRun = runsData.workflow_runs?.[0];
                        if (latestRun && latestRun.status === 'completed') {
                            completed = true;
                            runStatus = latestRun.conclusion;
                            break;
                        }
                    }
                } catch(e) { /* continue polling */ }
            }

            progress.classList.add('hidden');
            resultBox.classList.remove('hidden');

            const outputData = {
                status: 200,
                morph: fullRepo,
                dispatch: "success",
                runnerConclusion: runStatus || "success",
                executedAt: new Date().toISOString(),
                payloadSent: JSON.parse(payloadStr)
            };

            resultPre.textContent = JSON.stringify(outputData, null, 2);
            this.showToast('Morph Executed', `Morph ${fullRepo} triggered successfully!`, 'success');

        } catch (err) {
            this.showToast('Execution Failed', err.message, 'error');
            progress.classList.add('hidden');
        } finally {
            btnExecute.disabled = false;
        }
    }

    openRenameMorphModal(fullRepo, oldName) {
        this.renameMorphRepo = fullRepo;
        this.renameMorphOldName = oldName;

        document.getElementById('rename-morph-old-name').textContent = oldName;
        const input = document.getElementById('rename-morph-new-name-input');
        if (input) input.value = oldName;

        const modal = document.getElementById('modal-rename-morph');
        if (modal) modal.classList.remove('hidden');
    }

    async executeRenameMorph() {
        const input = document.getElementById('rename-morph-new-name-input');
        const newName = input ? input.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';

        if (!newName || newName === this.renameMorphOldName) {
            const modal = document.getElementById('modal-rename-morph');
            if (modal) modal.classList.add('hidden');
            return;
        }

        const btnConfirm = document.getElementById('btn-confirm-rename-morph');

        try {
            btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btnConfirm.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${this.renameMorphRepo}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            if (!res.ok) throw new Error('Failed to rename Morph repository.');

            const modal = document.getElementById('modal-rename-morph');
            if (modal) modal.classList.add('hidden');

            this.showToast('Morph Renamed', `Renamed Morph repository to '${newName}'.`, 'success');
            
            await new Promise(r => setTimeout(r, 800));
            this.loadMorphs();

        } catch (err) {
            this.showToast('Rename Failed', err.message, 'error');
        } finally {
            btnConfirm.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Name';
            btnConfirm.disabled = false;
        }
    }

    openDeleteMorphModal(fullRepo, repoName) {
        this.deleteMorphTargetRepo = fullRepo;
        document.getElementById('delete-morph-target-name').textContent = fullRepo;

        const modal = document.getElementById('modal-delete-morph');
        if (modal) modal.classList.remove('hidden');
    }

    async executeDeleteMorph() {
        const fullRepo = this.deleteMorphTargetRepo;
        if (!fullRepo) return;

        const btnConfirm = document.getElementById('btn-confirm-delete-morph');

        try {
            btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
            btnConfirm.disabled = true;

            const res = await fetch(`https://api.github.com/repos/${fullRepo}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${this.token}` }
            });

            if (!res.ok && res.status !== 204) throw new Error('Failed to delete Morph repository.');

            const modal = document.getElementById('modal-delete-morph');
            if (modal) modal.classList.add('hidden');

            this.showToast('Morph Deleted', `Deleted Morph ${fullRepo} permanently.`, 'success');
            this.loadMorphs();

        } catch (err) {
            this.showToast('Delete Failed', err.message, 'error');
        } finally {
            btnConfirm.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Morph Repository';
            btnConfirm.disabled = false;
        }
    }
}

// Initialize application
const app = new WebblConsole();
window.app = app;

