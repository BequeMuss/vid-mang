let db;
let noteDB; // Make noteDB global
const request = indexedDB.open('fileDB', 1);

if (document.getElementById('ideas')) {
  enableAutoSaveTextarea('ideas');
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleVideosBtn = document.getElementById('toggleVideos');
  const toggleNotesBtn = document.getElementById('toggleNotes');
  const toggleCalendarBtn = document.getElementById('toggleCalendar');
  const fileList = document.getElementById('fileList');
  const notes = document.getElementById('notes');
  const calendar = document.getElementById('calendar');
  const addNoteFieldBtn = document.getElementById('addNoteFieldBtn');
  const noteFieldsContainer = document.getElementById('noteFieldsContainer');

  // IndexedDB setup for note fields
  const noteRequest = indexedDB.open('noteFieldsDB', 1);

  noteRequest.onupgradeneeded = (event) => {
    noteDB = event.target.result;
    if (!noteDB.objectStoreNames.contains('noteFields')) {
      noteDB.createObjectStore('noteFields', { keyPath: 'id', autoIncrement: true });
    }
  };

  noteRequest.onsuccess = (event) => {
    noteDB = event.target.result;
    loadNoteFields();
  };

  noteRequest.onerror = (event) => {
    console.error('Error opening noteFieldsDB', event);
  };

  // Function to add a new note field
  function addNoteField(title = '', content = '', id = null) {
    const noteField = document.createElement('div');
    noteField.className = 'note-field liquid-glass';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'note-title';
    titleInput.placeholder = 'Titel';
    titleInput.value = title;

    const contentTextarea = document.createElement('textarea');
    contentTextarea.className = 'note-content liquid-glass';
    contentTextarea.id = 'ideas';
    contentTextarea.placeholder = '✏️Schreib...';
    contentTextarea.value = content;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note-btn';
    deleteBtn.textContent = '🗑️';

    noteField.appendChild(titleInput);
    noteField.appendChild(contentTextarea);
    noteField.appendChild(deleteBtn);
    noteFieldsContainer.appendChild(noteField);

    // Save or update note field in IndexedDB
    function saveNoteField() {
  try {
    if (!titleInput.value && !contentTextarea.value) {
      return; // Leere Notiz nicht speichern
    }

    const tx = noteDB.transaction('noteFields', 'readwrite');
    const store = tx.objectStore('noteFields');

    const noteData = {
      title: titleInput.value,
      content: contentTextarea.value
    };

    if (id !== null) {
      noteData.id = id;
    }

    if (id === null) {
      const addRequest = store.add(noteData);
      addRequest.onsuccess = (e) => {
        id = e.target.result;
        enableAutoSaveTextareaForField(titleInput, contentTextarea, id);
      };
      addRequest.onerror = (e) => {
        console.error('Error adding note:', e);
      };
    } else {
      const putRequest = store.put(noteData);
      putRequest.onsuccess = () => {
        enableAutoSaveTextareaForField(titleInput, contentTextarea, id);
      };
      putRequest.onerror = (e) => {
        console.error('Error updating note:', e);
      };
    }
  } catch (error) {
    console.error('Exception in saveNoteField:', error);
  }
}


    // Use existing enableAutoSaveTextarea logic for autosave and persistence
    function enableAutoSaveTextareaForField(titleInput, contentTextarea, fieldId) {
      const dbName = 'noteFieldsDB';
      const storeName = 'noteFields';
      let db;

      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = event => {
        db = event.target.result;
        loadData();
      };

      function saveData() {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const noteData = {
          id: fieldId,
          title: titleInput.value,
          content: contentTextarea.value
        };
        store.put(noteData);
      }

      function loadData() {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getRequest = store.get(fieldId);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            titleInput.value = getRequest.result.title;
            contentTextarea.value = getRequest.result.content;
          }
        };
      }

      titleInput.addEventListener('input', saveData);
      contentTextarea.addEventListener('input', saveData);
    }

    titleInput.addEventListener('input', saveNoteField);
    contentTextarea.addEventListener('input', saveNoteField);

    deleteBtn.addEventListener('click', () => {
      if (id !== null) {
        const tx = noteDB.transaction('noteFields', 'readwrite');
        const store = tx.objectStore('noteFields');
        store.delete(id);
        tx.oncomplete = () => {
          noteFieldsContainer.removeChild(noteField);
        };
      } else {
        noteFieldsContainer.removeChild(noteField);
      }
    });
  }

  // Load all note fields from IndexedDB
  function loadNoteFields() {
    const tx = noteDB.transaction('noteFields', 'readonly');
    const store = tx.objectStore('noteFields');
    const request = store.getAll();

    request.onsuccess = () => {
      noteFieldsContainer.innerHTML = '';
      if (request.result.length === 0) {
        // If no notes exist, add a default empty note field
        addNoteField();
      } else {
        request.result.forEach(note => {
          addNoteField(note.title, note.content, note.id);
        });
      }
    };
  }

  // Show/hide notes, videos, and calendar
  function showVideos() {
    fileList.style.display = 'block';
    notes.style.display = 'none';
    calendar.style.display = 'none';
    addNoteFieldBtn.style.display = 'none';
    toggleVideosBtn.classList.add('active');
    toggleNotesBtn.classList.remove('active');
    toggleCalendarBtn.classList.remove('active');
    localStorage.setItem('viewMode', 'videos');
    
    // Update section title dynamically
    document.getElementById('currentSectionTitle').textContent = 'Gespeicherte Videos';
  }

  function showNotes() {
    fileList.style.display = 'none';
    notes.style.display = 'block';
    calendar.style.display = 'none';
    addNoteFieldBtn.style.display = 'block';
    toggleVideosBtn.classList.remove('active');
    toggleNotesBtn.classList.add('active');
    toggleCalendarBtn.classList.remove('active');
    localStorage.setItem('viewMode', 'notes');
    
    // Update section title dynamically
    document.getElementById('currentSectionTitle').textContent = 'Notizen';
  }

  let calendarInstance = null;

  function showCalendar() {
    fileList.style.display = 'none';
    notes.style.display = 'none';
    calendar.style.display = 'block';
    addNoteFieldBtn.style.display = 'none';
    toggleVideosBtn.classList.remove('active');
    toggleNotesBtn.classList.remove('active');
    toggleCalendarBtn.classList.add('active');
    localStorage.setItem('viewMode', 'calendar');
    
    // Update section title dynamically
    document.getElementById('currentSectionTitle').textContent = 'Kalender';
    
    // Reload calendar when calendar tab is clicked
    reloadCalendar();
  }

  async function reloadCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // Clean up existing calendar instance
    if (calendarInstance) {
      calendarInstance.destroy();
      calendarInstance = null;
    }

    // Fetch fresh data from IndexedDB
    const entries = await getAllEntriesFromIndexedDB();
    
    const events = entries.map(entry => ({
      title: entry.name,
      start: entry.publishingDate ? entry.publishingDate.split('.').reverse().join('-') : null
    })).filter(event => event.start !== null);

    // Create new calendar instance with fresh data
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      expandRows: true,
      height: '100%',
      width: '100%',
      contentHeight: 'auto',
      dayMaxEventRows: 3,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      editable: true,
      events: events,
      eventClick: function(info) {
        handleCalendarEventClick(info.event.title);
      },
      eventDrop: function(info) {
        const videoName = info.event.title;
        const newDateObj = info.event.start;
        const day = String(newDateObj.getDate()).padStart(2, '0');
        const month = String(newDateObj.getMonth() + 1).padStart(2, '0');
        const year = newDateObj.getFullYear();
        const newDate = `${day}.${month}.${year}`;
        updateDate(videoName, newDate);
        reloadCalendar();
      }
    });

    calendarInstance.render();
  }

  toggleVideosBtn.addEventListener('click', showVideos);
  toggleNotesBtn.addEventListener('click', showNotes);
  toggleCalendarBtn.addEventListener('click', showCalendar);

  addNoteFieldBtn.addEventListener('click', () => {
    addNoteField();
  });

  // Function to handle calendar event clicks
  function handleCalendarEventClick(videoName) {
    // Switch to video list view
    showVideos();
    
    // Small delay to ensure view switch is complete
    setTimeout(() => {
        // Open info modal for the clicked video
        openInfoModal(videoName);
    }, 100);
  }

  // Load saved mode from localStorage or default to videos
  const savedMode = localStorage.getItem('viewMode');
  if (savedMode === 'notes') {
    showNotes();
  } else if (savedMode === 'calendar') {
    showCalendar();
    // Also reload calendar when browser is refreshed while on calendar tab
    setTimeout(() => {
      reloadCalendar();
    }, 100);
  } else {
    showVideos();
  }
});

request.onupgradeneeded = (event) => {
    db = event.target.result;
    console.log('Upgrade: ObjectStore erstellen');
    if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'name' });
        console.log('ObjectStore "files" erstellt');
    }
};


request.onsuccess = (event) => {
    db = event.target.result;
    listFiles();
    checkTodayVideos();
};

function checkTodayVideos() {
    const tx = db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const request = store.getAll();

    request.onsuccess = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const todayStr = `${day}.${month}.${year}`;

        const dueTodayVideos = [];
        const overdueVideos = [];

        request.result.forEach(file => {
            if (!file.publishingDate) return;
            const [d, m, y] = file.publishingDate.split('.');
            const fileDate = new Date(`${y}-${m}-${d}`);
            if (fileDate.toDateString() === today.toDateString()) {
                dueTodayVideos.push(file.name);
            } else if (fileDate < today) {
                overdueVideos.push(file.name);
            }
        });

        if (dueTodayVideos.length > 0) {
            const videoNames = dueTodayVideos.map(name => `• ${name}`).join('\n');
            alert(`⚠️ Heute folgendes Video hochladen:\n\n${videoNames}`);
        }

        if (overdueVideos.length > 0) {
            const videoNames = overdueVideos.map(name => `• ${name}`).join('\n');
            alert(`⚠️ Verpasste Videos:\n\n${videoNames}`);
        }
    };
};

request.onerror = (event) => {
    alert('Fehler beim Öffnen der Datenbank');
    console.error(event);
};

function saveFile() {
    const input = document.getElementById('fileInput');
    const noteInput = document.getElementById('noteInput');
    const file = input.files[0];
    const note = noteInput.value;

    if (!file) return alert('Bitte zuerst eine Datei auswählen.');

    // Extract metadata and generate thumbnail from video file
    extractMetadata(file).then(metadata => {
        generateThumbnail(file).then((thumbnailDataUrl) => {
            const fileEntry = {
                name: file.name,
                file: file,
                note: note,
                publishingDate: null,
                thumbnail: thumbnailDataUrl || null,
                uploadDate: new Date().toISOString(),
                duration: metadata.duration,
                width: metadata.width,
                height: metadata.height,
                fileSize: metadata.fileSize
            };

            const tx = db.transaction(['files'], 'readwrite');
            const store = tx.objectStore('files');
            store.put(fileEntry);

            tx.oncomplete = () => {
                input.value = '';
                noteInput.value = '';
                // Force UI update after a short delay to ensure thumbnail is displayed
                setTimeout(() => {
                    listFiles();
                }, 100);
            };
        }).catch((error) => {
            console.error('Error generating thumbnail:', error);
            alert('Fehler beim Erstellen des Vorschaubilds.');
        });
    }).catch(error => {
        console.error('Error extracting metadata:', error);
        alert('Fehler beim Extrahieren der Metadaten.');
    });
}

// New function to extract video metadata
function extractMetadata(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');

        video.preload = 'metadata';
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            const duration = video.duration; // in seconds
            const width = video.videoWidth;
            const height = video.videoHeight;
            const fileSize = file.size; // in bytes

            URL.revokeObjectURL(url);

            resolve({
                duration,
                width,
                height,
                fileSize
            });
        });

        video.addEventListener('error', (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        });
    });
}

// Helper function to generate thumbnail from video file
function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');

        video.preload = 'metadata';
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        video.addEventListener('canplay', () => {
    try {
        video.currentTime = Math.min(1, video.duration / 2); // bessere Stelle zum Thumbnail
    } catch (e) {
        reject(e);
    }
});


        video.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg');
            URL.revokeObjectURL(url);
            resolve(thumbnailDataUrl);
        });

        video.addEventListener('error', (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        });
    });
}

function listFiles() {
    const filesDiv = document.getElementById('files');
    filesDiv.innerHTML = '';

    const tx = db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const request = store.getAll();

    request.onsuccess = () => {
        let filteredEntries = request.result;

        // Apply filters
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const tagFilter = document.getElementById('tagFilter')?.value || 'all';
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;

        // Search filter
        if (searchTerm) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.name.toLowerCase().includes(searchTerm) ||
                (entry.note && entry.note.toLowerCase().includes(searchTerm)) ||
                (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            filteredEntries = filteredEntries.filter(entry => {
                if (!entry.publishingDate) {
                    return statusFilter === 'no-date';
                }

                const [day, month, year] = entry.publishingDate.split('.');
                const publishDate = new Date(year, month - 1, day);
                publishDate.setHours(0, 0, 0, 0);

                switch (statusFilter) {
                    case 'upcoming':
                        return publishDate > today;
                    case 'overdue':
                        return publishDate < today;
                    case 'published':
                        return publishDate <= today;
                    default:
                        return true;
                }
            });
        }

        // Tag filter
        if (tagFilter !== 'all') {
            filteredEntries = filteredEntries.filter(entry =>
                entry.tags && entry.tags.includes(tagFilter)
            );
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filteredEntries = filteredEntries.filter(entry => {
                if (!entry.publishingDate) return false;

                const [day, month, year] = entry.publishingDate.split('.');
                const entryDate = new Date(year, month - 1, day);
                entryDate.setHours(0, 0, 0, 0);

                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (entryDate < fromDate) return false;
                }

                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(0, 0, 0, 0);
                    if (entryDate > toDate) return false;
                }

                return true;
            });
        }

        // Display filtered results
        filteredEntries.forEach((entry) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item liquid-glass';

            // Determine status for styling
            let statusClass = '';
            if (entry.publishingDate) {
                const [day, month, year] = entry.publishingDate.split('.');
                const publishDate = new Date(year, month - 1, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (publishDate > today) {
                    statusClass = 'status-upcoming';
                } else if (publishDate < today) {
                    statusClass = 'status-overdue';
                } else {
                    statusClass = 'status-published';
                }
            } else {
                statusClass = 'status-no-date';
            }

            fileItem.innerHTML = `
  <img src="${entry.thumbnail || 'https://picsum.photos/id/10/100'}" alt="Vorschaubild">
  <div class="file-text">
    <p>
      <strong>${entry.name}</strong>
      ${entry.tags && entry.tags.length > 0 ? `<span class="file-tags">${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</span>` : ''}
    </p>
    <p><em>${entry.note || 'Keine Notiz'}</em></p>
    <p><span id="date-display-${entry.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="${statusClass}">${entry.publishingDate || 'Kein Datum'}</span></p>
  </div>
    <button class="info-btn" onclick="openInfoModal('${entry.name}')">ℹ️ Info</button>

`;

            filesDiv.appendChild(fileItem);
        });

        // Update filter counts
        updateFilterCounts(request.result, filteredEntries);
    };
}

// Modal functionality
function openInfoModal(fileName) {
    const tx = db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(fileName);

    request.onsuccess = () => {
        const entry = request.result;
        if (!entry) return;

        // Create modal if it doesn't exist
        let modal = document.getElementById('infoModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'infoModal';
            modal.className = 'modal';
        modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Video Details</h3>
                        <span class="close-modal" onclick="closeInfoModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <img id="modal-thumbnail" src="" alt="Vorschaubild">
                        <p><strong>Dateiname:</strong> <span id="modal-filename" class="fileItem"></span></p>
                        
                        <div class="modal-section">
                          <h4>Video Details (änderbar)</h4>
                          <p><strong>Notiz:</strong> <span id="modal-note" class="editable-field"></span></p>
                          <p><strong>Veröffentlichungsdatum:</strong> <span id="modal-date" class="editable-field"></span></p>
                        </div>
                        
                        <div class="modal-section">
                          <h4>Technische Informationen</h4>
                          <p><strong>Hochgeladen am:</strong> <span id="modal-upload"></span></p>
                          <p><strong>Dauer:</strong> <span id="modal-duration"></span></p>
                          <p><strong>Auflösung:</strong> <span id="modal-resolution"></span></p>
                          <p><strong>Dateigröße:</strong> <span id="modal-filesize"></span></p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="download-btn" onclick="downloadFromModal()">⬇️ Download</button>
                        <button class="delete-btn" onclick="deleteFromModal()">🗑️ Löschen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Always update the thumbnail and other data for the current video
        const modalThumbnail = document.getElementById('modal-thumbnail');
        if (modalThumbnail) {
            modalThumbnail.src = entry.thumbnail || 'https://picsum.photos/id/10/100';
        }

        // Populate modal with data
        document.getElementById('modal-filename').textContent = entry.name;
        const modalNote = document.getElementById('modal-note');
        const modalDate = document.getElementById('modal-date');
        modalNote.textContent = entry.note || 'Keine Notiz';
        modalDate.textContent = entry.publishingDate || 'Kein Datum gewählt';
        document.getElementById('modal-upload').textContent = new Date(entry.uploadDate).toLocaleDateString('de-DE');

        // Enable inline editing for note
        modalNote.contentEditable = 'true';

        // Add event listeners for auto-save
        modalNote.addEventListener('blur', () => {
            const newNote = modalNote.textContent.trim();
            if (newNote !== 'Keine Notiz') {
                updateNote(fileName, newNote);
            }
        });

        modalNote.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                modalNote.blur();
            }
        });

        // Enable inline date editing
        modalDate.addEventListener('click', () => {
            if (document.querySelector('.modal-date-input')) return; // Prevent multiple inputs

            const currentDate = modalDate.textContent;
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'modal-date-input';
            dateInput.style.width = '100%';
            dateInput.style.padding = '4px';
            dateInput.style.border = '1px solid #ccc';
            dateInput.style.borderRadius = '4px';

            // Convert current date to ISO format for input
            if (currentDate && currentDate !== 'Kein Datum gewählt') {
                const [day, month, year] = currentDate.split('.');
                dateInput.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            modalDate.style.display = 'none';
            modalDate.parentNode.insertBefore(dateInput, modalDate.nextSibling);

            const saveDate = () => {
                const selectedDate = dateInput.value;
                if (selectedDate) {
                    const [year, month, day] = selectedDate.split('-');
                    const formattedDate = `${day}.${month}.${year}`;
                    modalDate.textContent = formattedDate;
                    updateDate(fileName, formattedDate);
                } else {
                    modalDate.textContent = 'Kein Datum gewählt';
                }
                modalDate.style.display = 'inline';
                dateInput.remove();
            };

            const cancelEdit = () => {
                modalDate.style.display = 'inline';
                dateInput.remove();
            };

            dateInput.addEventListener('change', saveDate);
            dateInput.addEventListener('blur', cancelEdit);
            dateInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveDate();
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });

            setTimeout(() => dateInput.focus(), 0);
        });
        
        // Populate metadata fields
        document.getElementById('modal-duration').textContent = entry.duration ? formatDuration(entry.duration) : 'Nicht verfügbar';
        document.getElementById('modal-resolution').textContent = entry.width && entry.height ? `${entry.width}×${entry.height}` : 'Nicht verfügbar';
        document.getElementById('modal-filesize').textContent = entry.fileSize ? formatFileSize(entry.fileSize) : 'Nicht verfügbar';

        // Store current file name for modal actions
        modal.dataset.currentFile = fileName;

        // Show modal
        modal.style.display = 'block';
    };
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        // Save any pending note edit before closing
        const modalNote = document.getElementById('modal-note');
        const fileName = modal.dataset.currentFile;
        
        if (modalNote && fileName) {
            const newNote = modalNote.textContent.trim();
            if (newNote !== 'Keine Notiz') {
                updateNote(fileName, newNote);
            }
        }
        
        // Clean up any active note editing input groups
        const inputGroups = document.querySelectorAll('.input-group');
        inputGroups.forEach(group => {
            group.remove();
        });
        
        modal.style.display = 'none';
    }
}

// Modal action functions
function editNoteFromModal() {
    const modal = document.getElementById('infoModal');
    const fileName = modal.dataset.currentFile;
    closeInfoModal();
    
    // Find the file item and trigger edit
    const tx = db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(fileName);
    
    request.onsuccess = () => {
        const entry = request.result;
        const newNote = prompt('Neue Notiz eingeben:', entry.note || '');
        if (newNote !== null) {
            updateNote(fileName, newNote);
        }
    };
}

function editDateFromModal() {
    const modal = document.getElementById('infoModal');
    const fileName = modal.dataset.currentFile;
    closeInfoModal();
    
    const newDate = prompt('Neues Veröffentlichungsdatum (DD.MM.YYYY):');
    if (newDate && newDate.trim()) {
        updateDate(fileName, newDate.trim());
    }
}

function downloadFromModal() {
    const modal = document.getElementById('infoModal');
    const fileName = modal.dataset.currentFile;
    closeInfoModal();
    downloadFile(fileName);
}

function deleteFromModal() {
    const modal = document.getElementById('infoModal');
    const fileName = modal.dataset.currentFile;
    
    if (confirm(`Möchten Sie "${fileName}" wirklich löschen?`)) {
        closeInfoModal();
        deleteFile(fileName);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target === modal) {
        closeInfoModal();
    }
}

function downloadFile(key) {
    const tx = db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(key);

    request.onsuccess = () => {
        const file = request.result.file;
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = key;
        a.click();
        URL.revokeObjectURL(url);
    };
}

function deleteFile(fileName) {
    const tx = db.transaction(['files'], 'readwrite');
    const store = tx.objectStore('files');
    const request = store.delete(fileName);

    request.onsuccess = () => {
        console.log(`Datei "${fileName}" erfolgreich gelöscht.`);
        listFiles();
    };

    request.onerror = () => {
        alert('Fehler beim Löschen der Datei.');
    };
}

function openDatePicker(clickedButton) {
  let filename;
  
  // Check if we're in modal context
  const modal = document.getElementById('infoModal');
  if (modal && modal.style.display === 'block') {
    filename = modal.dataset.currentFile;
  } else {
    // Regular file list context
    const fileItem = clickedButton.closest('.file-item');
    if (!fileItem) {
      console.error('Could not find file item');
      return;
    }
    filename = fileItem.querySelector('strong').textContent.trim();
  }
  
  const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'auto-remove-date';

  clickedButton.insertAdjacentElement('afterend', dateInput);

  const formatDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}.${month}.${year}`;
  };

  // Wenn ein Datum ausgewählt wurde
  const handleChange = () => {
    const selectedDate = dateInput.value;
    if (selectedDate) {
      const displaySpan = document.getElementById(`date-display-${safeFilename}`);
      if (displaySpan) {
        const formattedDate = formatDate(selectedDate);
        displaySpan.textContent = formattedDate;
      }
      updateDate(filename, formatDate(selectedDate));

      // Update modal field if modal is open
      const modal = document.getElementById('infoModal');
      if (modal && modal.style.display === 'block') {
        const modalDate = document.getElementById('modal-date');
        if (modalDate) {
          modalDate.textContent = formatDate(selectedDate);
        }
      }
    }
    dateInput.remove();
  };

  // Wenn das Feld den Fokus verliert (z. B. durch Klick woanders)
  const handleBlur = () => {
    if (!dateInput.value) {
      dateInput.remove();
    }
  };

  dateInput.addEventListener('change', handleChange);
  dateInput.addEventListener('blur', handleBlur);

  setTimeout(() => dateInput.focus(), 0);
  console.log("Datumsauswahl gestartet für Datei:", filename);
}


function editNote(clickedButton) {
  if (document.querySelector('.input-group')) return;
  
  let filename;
  
  // Check if we're in modal context
  const modal = document.getElementById('infoModal');
  if (modal && modal.style.display === 'block') {
    filename = modal.dataset.currentFile;
  } else {
    // Regular file list context
    const fileItem = clickedButton.closest('.file-item');
    if (!fileItem) {
      console.error('Could not find file item');
      return;
    }
    filename = fileItem.querySelector('strong').textContent.trim();
  }

  const groupDiv = document.createElement('div');
  groupDiv.className = 'input-group';

  const input = document.createElement('input');
  input.type = 'text';
  
  // Get current note value - skip "Keine Notiz"
  let currentNote = '';
  if (modal && modal.style.display === 'block') {
    const modalNote = document.getElementById('modal-note').textContent;
    if (modalNote !== 'Keine Notiz') {
      currentNote = modalNote;
    }
  } else {
    const fileItem = clickedButton.closest('.file-item');
    const noteElement = fileItem.querySelector('em');
    if (noteElement && noteElement.textContent !== 'Keine Notiz') {
      currentNote = noteElement.textContent;
    }
  }
  
  input.value = currentNote;
  input.placeholder = "Neue Notiz...";

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Bestätigen';
  confirmBtn.classList.add('editbutton');

  groupDiv.appendChild(input);
  groupDiv.appendChild(confirmBtn);

  clickedButton.insertAdjacentElement('afterend', groupDiv);

  confirmBtn.addEventListener('click', () => {
    const text = input.value.trim();
    updateNote(filename, text);

    // Update modal field if modal is open
    const modal = document.getElementById('infoModal');
    if (modal && modal.style.display === 'block') {
      const modalNote = document.getElementById('modal-note');
      if (modalNote) {
        modalNote.textContent = text || 'Keine Notiz';
      }
    }

    groupDiv.remove();
  });
}


function updateNote(fileName, newNote) {
    const tx = db.transaction(['files'], 'readwrite');
    const store = tx.objectStore('files');
    const request = store.get(fileName); // Holt das Objekt anhand des Schlüssels

    request.onsuccess = () => {
        const data = request.result;
        if (!data) {
            alert('Datei nicht gefunden!');
            return;
        }

        data.note = newNote; // Notiz ändern
        store.put(data);     // Speichern

        tx.oncomplete = () => {
            console.log('Notiz erfolgreich aktualisiert.');
            listFiles(); // Liste ggf. neu laden
        };
    };

    request.onerror = () => {
        alert('Fehler beim Laden der Datei.');
    };
}

function updateDate(fileName, newDate) {
    const tx = db.transaction(['files'], 'readwrite');
    const store = tx.objectStore('files');
    const request = store.get(fileName); // Holt das Objekt anhand des Schlüssels

    request.onsuccess = () => {
        const data = request.result;
        if (!data) {
            alert('Datei nicht gefunden!');
            return;
        }

        data.publishingDate = newDate; // Datum ändern
        store.put(data);     // Speichern

        tx.oncomplete = () => {
            console.log('Datum erfolgreich aktualisiert.');
            listFiles(); // Liste ggf. neu laden
        };
    };

    request.onerror = () => {
        alert('Fehler beim Laden der Datei.');
    };
}




function enableAutoSaveTextarea(textareaId) {
  const dbName = 'TextAutoSaveDB';
  const storeName = 'notesStore';
  let db;

  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = event => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName);
    }
  };

  request.onsuccess = event => {
    db = event.target.result;
    loadData();
  };

  function saveData(text) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(text, textareaId); // Schlüssel ist die textareaId (für mehrere Felder nutzbar)
  }

  function loadData() {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const getRequest = store.get(textareaId);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const textarea = document.getElementById(textareaId);
        if (textarea) {
          textarea.value = getRequest.result;
        }
      }
    };
  }

  const textarea = document.getElementById(textareaId);
  if (!textarea) {
    console.error(`Textarea mit id "${textareaId}" nicht gefunden.`);
    return;
  }

  textarea.addEventListener('input', () => {
    saveData(textarea.value);
  });
}


async function getAllEntriesFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fileDB', 1);

    request.onerror = () => reject('Error opening DB');
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');

      const entries = [];
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };

      cursorRequest.onerror = () => reject('Error reading entries');
    };
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  // Migrate existing data from 'date' to 'publishingDate'
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('fileDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error opening DB');
  });

  const tx = db.transaction(['files'], 'readwrite');
  const store = tx.objectStore('files');
  const cursorRequest = store.openCursor();

  cursorRequest.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const data = cursor.value;
      if (data.hasOwnProperty('date')) {
        data.publishingDate = data.date;
        delete data.date;
        cursor.update(data);
      }
      cursor.continue();
    }
  };

  // Continue with calendar setup after migration
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const entries = await getAllEntriesFromIndexedDB();

  const events = entries.map(entry => ({
    title: entry.name,
    start: entry.publishingDate ? entry.publishingDate.split('.').reverse().join('-') : null
  })).filter(event => event.start !== null);

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    editable: true,
    events: events,
    eventDrop: function(info) {
      const videoName = info.event.title;
      const newDateObj = info.event.start;
      const day = String(newDateObj.getDate()).padStart(2, '0');
      const month = String(newDateObj.getMonth() + 1).padStart(2, '0');
      const year = newDateObj.getFullYear();
      const newDate = `${day}.${month}.${year}`;
      updateDate(videoName, newDate);
      reloadCalendar();
    }
  });

  calendar.render();
});

document.addEventListener('DOMContentLoaded', function () {
      const calendarEl = document.getElementById('calendar');

      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        expandRows: true,            // ← zeigt IMMER vollen Monat
        height: '100%',              // ← passt sich Container an
        contentHeight: 'auto',
        dayMaxEventRows: 3,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        events: [
          { title: 'Example Event', start: '2025-08-01' },
          { title: 'Meeting', start: '2025-08-05' }
        ]
      });

      calendar.render();
    });

// Helper function to format duration in seconds to HH:MM:SS format
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Nicht verfügbar';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Helper function to format file size in bytes to human-readable format
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return 'Nicht verfügbar';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Function to update filter stats
function updateFilterCounts(totalEntries, filteredEntries) {
    const filterStats = document.getElementById('filterStats');
    if (filterStats) {
        const total = totalEntries.length;
        const filtered = filteredEntries.length;
        filterStats.textContent = `Videos: ${total} | Gefiltert: ${filtered}`;
    }
}

// Function to clear all filters
function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const tagFilter = document.getElementById('tagFilter');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (tagFilter) tagFilter.value = 'all';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';

    listFiles();
}

// Function to handle calendar event clicks - moved inside DOMContentLoaded scope
// This function is now defined within the DOMContentLoaded callback
// Backup/Export functionality
document.addEventListener('DOMContentLoaded', function() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');

  // Export data as ZIP including video files
  exportBtn.addEventListener('click', async function() {
    try {
      const zip = new JSZip();

      // Export videos from IndexedDB
      const videoEntries = await getAllEntriesFromIndexedDB();

      // Prepare metadata without file blobs
      const videosMetadata = videoEntries.map(entry => ({
        name: entry.name,
        note: entry.note,
        publishingDate: entry.publishingDate,
        uploadDate: entry.uploadDate,
        duration: entry.duration,
        width: entry.width,
        height: entry.height,
        fileSize: entry.fileSize,
        tags: entry.tags || [],
        thumbnail: entry.thumbnail
      }));

      // Export notes from IndexedDB
      const noteEntries = await getAllNotesFromIndexedDB();
      const notesMetadata = noteEntries.map(entry => ({
        id: entry.id,
        title: entry.title,
        content: entry.content
      }));

      // Add metadata JSON file to ZIP
      const metadata = {
        videos: videosMetadata,
        notes: notesMetadata,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Add video files to ZIP
      for (const entry of videoEntries) {
        if (entry.file) {
          // Read Blob as ArrayBuffer
          const arrayBuffer = await entry.file.arrayBuffer();
          zip.file(`videos/${entry.name}`, arrayBuffer);
        }
      }

      // Generate ZIP file Blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-manager-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('✅ Daten erfolgreich exportiert!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Fehler beim Exportieren der Daten.');
    }
  });

  // Import data from JSON file
  importBtn.addEventListener('click', function() {
    importInput.click();
  });

  importInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Check if file is actually a ZIP file
      if (!file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('Bitte wählen Sie eine ZIP-Datei aus.');
      }

      // Use JSZip to read the ZIP file
      const zip = await JSZip.loadAsync(file);

      // Read metadata.json
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('metadata.json nicht in der ZIP-Datei gefunden. Stellen Sie sicher, dass es sich um eine gültige Exportdatei handelt.');
      }

      const metadataText = await metadataFile.async('string');

      // Debug: Log the metadata content
      console.log('Metadata content:', metadataText);

      if (!metadataText || metadataText.trim() === '') {
        throw new Error('metadata.json ist leer oder beschädigt.');
      }

      const importData = JSON.parse(metadataText);

      if (!importData.videos || !importData.notes) {
        throw new Error('Ungültiges Backup-Format. Die Datei enthält nicht die erwarteten Daten.');
      }

      // Confirm import
      const confirmImport = confirm(
        `⚠️ Import wird alle aktuellen Daten überschreiben!\n\n` +
        `Videos: ${importData.videos.length}\n` +
        `Notizen: ${importData.notes.length}\n\n` +
        `Fortfahren?`
      );

      if (!confirmImport) return;

      // Clear existing data
      await clearAllData();

      // Import videos with Blob files and metadata
      for (const video of importData.videos) {
        let videoBlob = null;
        const videoFile = zip.file(`videos/${video.name}`);
        if (videoFile) {
          const arrayBuffer = await videoFile.async('arraybuffer');
          videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
        }

        const videoEntry = {
          name: video.name,
          file: videoBlob,
          note: video.note || '',
          publishingDate: video.publishingDate,
          uploadDate: video.uploadDate || new Date().toISOString(),
          duration: video.duration,
          width: video.width,
          height: video.height,
          fileSize: video.fileSize,
          tags: video.tags || [],
          thumbnail: video.thumbnail || null
        };

        const tx = db.transaction(['files'], 'readwrite');
        const store = tx.objectStore('files');
        await new Promise((resolve, reject) => {
          const request = store.put(videoEntry);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Import notes
      const noteDB = await openNoteDB();
      for (const note of importData.notes) {
        const tx = noteDB.transaction(['noteFields'], 'readwrite');
        const store = tx.objectStore('noteFields');
        const noteData = {
          id: note.id,
          title: note.title || '',
          content: note.content || ''
        };
        await new Promise((resolve, reject) => {
          const request = store.put(noteData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Refresh UI
      listFiles();
      loadNoteFields();

      alert('✅ Daten erfolgreich importiert!');
    } catch (error) {
      console.error('Import error:', error);
      alert(`❌ Fehler beim Importieren der Daten:\n\n${error.message}`);
    }

    // Reset input
    event.target.value = '';
  });
});

// Add this function definition to fix the error
function loadNoteFields() {
  if (!noteDB) {
    console.error('noteDB is not initialized');
    return;
  }
  const noteFieldsContainer = document.getElementById('noteFieldsContainer');
  const tx = noteDB.transaction('noteFields', 'readonly');
  const store = tx.objectStore('noteFields');
  const request = store.getAll();

  request.onsuccess = () => {
    noteFieldsContainer.innerHTML = '';
    if (request.result.length === 0) {
      // If no notes exist, add a default empty note field
      addNoteField();
    } else {
      request.result.forEach(note => {
        addNoteField(note.title, note.content, note.id);
      });
    }
  };
}

// Helper function to get all notes from IndexedDB
async function getAllNotesFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('noteFieldsDB', 1);

    request.onerror = () => reject('Error opening noteFieldsDB');
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['noteFields'], 'readonly');
      const store = transaction.objectStore('noteFields');

      const entries = [];
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };

      cursorRequest.onerror = () => reject('Error reading notes');
    };
  });
}

// Helper function to open note database
function openNoteDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('noteFieldsDB', 1);

    request.onerror = () => reject('Error opening noteFieldsDB');
    request.onsuccess = () => resolve(request.result);
  });
}

// Helper function to clear all data
async function clearAllData() {
  return new Promise((resolve, reject) => {
    // Clear videos
    const videoTx = db.transaction(['files'], 'readwrite');
    const videoStore = videoTx.objectStore('files');
    videoStore.clear();

    // Clear notes
    const noteRequest = indexedDB.open('noteFieldsDB', 1);
    noteRequest.onsuccess = () => {
      const noteDB = noteRequest.result;
      const noteTx = noteDB.transaction(['noteFields'], 'readwrite');
      const noteStore = noteTx.objectStore('noteFields');
      noteStore.clear();

      resolve();
    };

    noteRequest.onerror = () => reject('Error clearing notes');
  });
}

