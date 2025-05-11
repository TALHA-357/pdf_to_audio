$(document).ready(function() {
    // Initialize word count on page load
    updateWordCount();
    
    // Handle file upload
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        const fileInput = $('#pdfFile')[0];
        if (fileInput.files.length === 0) {
            alert('Please select a PDF file first.');
            return;
        }
        
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        // Show progress bar
        $('#uploadProgress').removeClass('d-none');
        $('.progress-bar').css('width', '0%');
        
        // Disable upload button during processing
        $('#uploadBtn').prop('disabled', true);
        
        // Simulate progress (since we can't track actual upload progress with this simple implementation)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            $('.progress-bar').css('width', `${progress}%`);
            if (progress >= 95) clearInterval(progressInterval);
        }, 200);
        
        // Send AJAX request
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                clearInterval(progressInterval);
                $('.progress-bar').css('width', '100%');
                
                if (response.success) {
                    // Update file info
                    $('#fileInfo').html(`
                        <p><strong>File Name:</strong> ${response.filename}</p>
                        <p><strong>Status:</strong> <span class="text-success">Successfully processed</span></p>
                    `);
                    
                    // Display extracted text
                    $('#extractedText').val(response.text);
                    updateWordCount();
                } else {
                    $('#fileInfo').html(`
                        <p class="text-danger">Error: ${response.error}</p>
                    `);
                }
            },
            error: function(xhr) {
                clearInterval(progressInterval);
                let errorMsg = 'An error occurred during file upload.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                $('#fileInfo').html(`
                    <p class="text-danger">Error: ${errorMsg}</p>
                `);
            },
            complete: function() {
                $('#uploadBtn').prop('disabled', false);
                setTimeout(() => {
                    $('#uploadProgress').addClass('d-none');
                }, 1000);
            }
        });
    });
    
    // Copy text to clipboard
    $('#copyTextBtn').click(function() {
        const text = $('#extractedText').val();
        if (!text) {
            alert('No text to copy!');
            return;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            $(this).html('<i class="fas fa-check me-2"></i>Copied!');
            setTimeout(() => {
                $(this).html('<i class="fas fa-copy me-2"></i>Copy Text');
            }, 2000);
        });
    });
    
    // Clear text
    $('#clearTextBtn').click(function() {
        $('#extractedText').val('');
        $('#translatedText').val('');
        $('#processedText').val('');
        $('#audioPlayerContainer').addClass('d-none');
        updateWordCount();
    });
    
    // Translate text
    $('#translateBtn').click(function() {
        const text = $('#extractedText').val().trim();
        
        if (!text) {
            alert('Please extract text first');
            return;
        }

        const btn = $(this);
        btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Translating...');
        btn.prop('disabled', true);

        $.ajax({
            url: '/translate',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                text: text,
                dest_language: $('#destLanguage').val()
            }),
            success: function(response) {
                if (response.success) {
                    $('#translatedText').val(response.translated_text);
                    if (response.note) {
                        alert(response.note);
                    }
                } else {
                    alert('Error: ' + (response.error || 'Translation failed'));
                }
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.error || 'Translation failed'));
            },
            complete: function() {
                btn.html('<i class="fas fa-exchange-alt me-2"></i>Translate');
                btn.prop('disabled', false);
            }
        });
    });
    
    // Generate audio
    $('#generateAudioBtn').click(function() {
        let text = $('#extractedText').val();
        const translatedText = $('#translatedText').val();
        
        // Use translated text if available
        if (translatedText) {
            text = translatedText;
        }
        
        if (!text) {
            alert('Please upload a PDF and extract text first!');
            return;
        }
        
        const language = $('#audioLanguage').val();
        const btn = $(this);
        btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Generating...');
        btn.prop('disabled', true);
        
        $.ajax({
            url: '/generate_audio',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                text: text,
                language: language
            }),
            success: function(response) {
                if (response.success) {
                    const audioPlayer = $('#audioPlayer')[0];
                    audioPlayer.src = response.audio_url;
                    
                    // Set download link
                    $('#downloadAudioBtn').attr('href', response.audio_url);
                    
                    // Show audio player
                    $('#audioPlayerContainer').removeClass('d-none');
                    
                    // Play audio automatically
                    setTimeout(() => {
                        audioPlayer.play();
                    }, 500);
                } else {
                    alert('Error: ' + response.error);
                }
            },
            error: function(xhr) {
                let errorMsg = 'Audio generation failed.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                alert(errorMsg);
            },
            complete: function() {
                btn.html('<i class="fas fa-music me-2"></i>Generate Audio');
                btn.prop('disabled', false);
            }
        });
    });

    // Dark mode toggle
    $('#darkModeToggle').change(function() {
        $('body').toggleClass('dark-mode');
        $('meta[name="color-scheme"]').attr('content', this.checked ? 'dark' : 'light');
    });

    // Text summarization
    $('#summarizeBtn').click(function() {
        const text = $('#extractedText').val();
        if (!text) {
            alert('Please upload a PDF and extract text first!');
            return;
        }

        const sentences = $('#summarySentences').val();
        const btn = $(this);
        btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Summarizing...');
        btn.prop('disabled', true);

        $.ajax({
            url: '/summarize',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                text: text,
                sentences: sentences
            }),
            success: function(response) {
                if (response.success) {
                    $('#processedText').val(response.summary);
                } else {
                    alert('Error: ' + response.error);
                }
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.error || 'Summarization failed'));
            },
            complete: function() {
                btn.html('<i class="fas fa-compress me-2"></i>Summarize');
                btn.prop('disabled', false);
            }
        });
    });

    // Language detection
    $('#detectLanguageBtn').click(function() {
        const text = $('#extractedText').val();
        if (!text) {
            alert('Please upload a PDF and extract text first!');
            return;
        }

        const btn = $(this);
        btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Detecting...');
        btn.prop('disabled', true);

        $.ajax({
            url: '/detect_language',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                text: text
            }),
            success: function(response) {
                if (response.success) {
                    $('#processedText').val(`Detected language: ${response.language}`);
                } else {
                    alert('Error: ' + response.error);
                }
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.error || 'Language detection failed'));
            },
            complete: function() {
                btn.html('<i class="fas fa-globe me-2"></i>Detect Language');
                btn.prop('disabled', false);
            }
        });
    });

    // Clear uploads folder
    $('#clearUploadsBtn').click(function() {
        if (confirm('Are you sure you want to clear all uploaded files?')) {
            const btn = $(this);
            btn.html('<i class="fas fa-spinner fa-spin me-2"></i>Clearing...');
            btn.prop('disabled', true);

            $.ajax({
                url: '/clear_uploads',
                type: 'POST',
                success: function(response) {
                    if (response.success) {
                        alert('Uploads folder cleared successfully!');
                    } else {
                        alert('Error: ' + response.error);
                    }
                },
                error: function(xhr) {
                    alert('Error: ' + (xhr.responseJSON?.error || 'Failed to clear uploads'));
                },
                complete: function() {
                    btn.html('<i class="fas fa-broom me-2"></i>Clear Uploads');
                    btn.prop('disabled', false);
                }
            });
        }
    });

    // Text editing toggle
    $('#editTextBtn').click(function() {
        const textarea = $('#extractedText');
        const isReadonly = textarea.prop('readonly');
        
        textarea.prop('readonly', !isReadonly);
        $(this).html(`<i class="fas fa-${isReadonly ? 'save' : 'edit'} me-1"></i>${isReadonly ? 'Save Text' : 'Edit Text'}`);
        
        if (isReadonly) {
            textarea.focus();
        }
    });

    // Word/character counter
    $('#extractedText').on('input', updateWordCount);
    
    // Function to update word and character count
    function updateWordCount() {
        const text = $('#extractedText').val();
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const charCount = text.length;
        
        $('#wordCount').text(`Words: ${wordCount}`);
        $('#charCount').text(`Chars: ${charCount}`);
    }
});