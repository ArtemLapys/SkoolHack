(() => {
    const STORAGE_KEY = 'vigu-language';
    const SUPPORTED_LANGS = ['ru', 'en'];

    const translations = {
        ru: {
            seo: {
                title: 'viGu Видеоредактор — онлайн монтаж, экспорт видео и HDR-обработка',
                description: 'viGu Видеоредактор — удобный браузерный видеоредактор для монтажа, нарезки, дублирования клипов, работы с изображениями и экспорта видео с выбором качества, FPS и HDR-обработки.',
                keywords: 'видеоредактор, онлайн видеоредактор, монтаж видео, экспорт видео, HDR видео, ffmpeg wasm, видеомонтаж в браузере, viGu',
                ogTitle: 'viGu Видеоредактор',
                ogDescription: 'Браузерный видеоредактор для монтажа, работы с таймлайном, HDR-экспорта и быстрого рендера прямо в вебе.',
                twitterTitle: 'viGu Видеоредактор',
                twitterDescription: 'Монтаж, экспорт и HDR-обработка видео в браузере.',
                locale: 'ru_RU',
                appName: 'viGu Видеоредактор',
                appDescription: 'Браузерный видеоредактор для монтажа, экспорта видео, работы с HDR и таймлайном.'
            },
            common: {
                close: 'Закрыть',
                cancel: 'Отмена'
            },
            brand: {
                badge: 'Видеоредактор',
                hint: 'Видеоредактор для быстрого монтажа, экспорта и HDR-обработки прямо в браузере'
            },
            header: {
                navAria: 'Основная навигация',
                languageSwitcher: 'Переключатель языка',
                tools: 'Инструменты',
                help: 'Справка',
                export: 'Экспортировать'
            },
            files: {
                title: 'Файлы проекта'
            },
            toolbar: {
                split: 'Разделить',
                duplicate: 'Дублировать',
                remove: 'Удалить',
                splitTitle: 'Разрезать эпизод',
                duplicateTitle: 'Дублировать эпизод',
                removeTitle: 'Удалить эпизод',
                toStartTitle: 'Вернуться в начало',
                playTitle: 'Проигрывать',
                pauseTitle: 'Приостановить',
                stopTitle: 'Остановить',
                zoomInTitle: 'Приблизить',
                zoomOutTitle: 'Отдалить'
            },
            faq: {
                title: 'Частые вопросы',
                lead: 'Собрали короткие и понятные ответы, чтобы сориентироваться в редакторе быстрее.',
                q1: {
                    q: 'Что умеет viGu?',
                    a: 'viGu помогает быстро собрать ролик в браузере: загрузить видео или изображения, расположить их на таймлайне, обрезать фрагменты, дублировать клипы и экспортировать результат в нужном качестве.'
                },
                q2: {
                    q: 'Почему обработка может идти медленно?',
                    a: 'Экспорт выполняется прямо в браузере через FFmpeg WebAssembly. Чем выше разрешение, FPS и сложнее HDR-обработка, тем дольше идёт рендер. Для ускорения обычно помогает выбрать меньшее качество, 24-30 FPS или быстрый HDR-режим.'
                },
                q3: {
                    q: 'Какой режим HDR лучше выбрать?',
                    a: 'Медленный режим лучше сохраняет цвет и плавнее переводит HDR в SDR. Быстрый режим подходит, когда важнее время рендера. Если нужен баланс, сначала попробуй быстрый, а для финальной версии переключись на медленный.'
                },
                q4: {
                    q: 'Как выбрать качество экспорта?',
                    a: 'Если ролик нужен для мессенджеров и быстрых черновиков, подойдут 480p или 720p. Для социальных сетей и стандартного просмотра чаще всего хватает 1080p. 4K стоит выбирать только когда исходники действительно высокого качества и важна максимальная детализация.'
                },
                q5: {
                    q: 'Какие FPS лучше использовать?',
                    a: '30 FPS — универсальный вариант по умолчанию. 24 или 25 FPS подойдут, если хочешь уменьшить размер файла и ускорить экспорт. 60 FPS имеет смысл для очень плавного движения, но он ощутимо увеличивает нагрузку на рендер.'
                },
                q6: {
                    q: 'Что делать, если видео выглядит бледно или слишком ярко?',
                    a: 'Чаще всего это связано с HDR-материалом. Попробуй поменять режим HDR в окне экспорта. Если изображение выглядит слишком ярким, включи медленный режим. Если нужен более быстрый результат, выбирай быстрый режим и проверь итоговый файл перед публикацией.'
                },
                q7: {
                    q: 'С чего начать работу в редакторе?',
                    a: 'Сначала загрузи файлы проекта, затем перетащи их на таймлайн. После этого можно обрезать лишнее, переставить клипы по времени и запустить экспорт. Если хочется просто быстро попробовать, загрузи один файл и сразу нажми «Экспортировать».'
                },
                q8: {
                    q: 'Как предложить новую функцию или сообщить об ошибке?',
                    a: 'Если хочешь предложить новую функцию или сообщить об ошибке, создай Discussion в GitHub проекта: <a class="modal-link" href="https://github.com/ArtemLapys/SkoolHack/discussions" target="_blank" rel="noopener noreferrer">github.com/ArtemLapys/SkoolHack/discussions</a>. Лучше коротко описать идею или проблему, приложить шаги воспроизведения и, если возможно, скриншот или лог.'
                }
            },
            footer: {
                text: 'viGu Видеоредактор — веб-инструмент для монтажа, экспорта и работы с HDR-видео.',
                update: 'Последнее обновление: 2026',
                hint: 'Нажми на логотип, чтобы открыть страницу команды, GitHub проекта и список создателей сервиса.'
            },
            exportSettings: {
                title: 'Параметры экспорта',
                quality: 'Качество',
                fps: 'FPS',
                hdr: 'Обработка HDR',
                hdrSlow: 'Медленный',
                hdrFast: 'Быстрый',
                hdrHint: 'Медленный режим точнее сохраняет цвет HDR, быстрый рендерит заметно быстрее, но может быть менее точным по цвету.'
            },
            exportProgress: {
                title: 'Экспортирование видео'
            },
            newProject: {
                title: 'Создание нового проекта',
                text1: 'Текущие файлы и дорожки в рабочей области будут удалены.',
                text2: 'Вы действительно хотите создать новый проект?',
                confirm: 'Создать'
            },
            deleteFile: {
                title: 'Удаление файла',
                body: 'Вы действительно хотите удалить файл <b><span id="modal-body-span" class="text-break"></span></b> ?'
            },
            help: {
                title: 'Справка',
                item1: '<kbd>Пробел</kbd> - Включить/остановить воспроизведение',
                item2: '<kbd>←</kbd> <kbd class="my-2">→</kbd> - Шаг влево/вправо в рабочей области',
                item3: '<kbd>+</kbd> <kbd class="my-2">-</kbd> - Увеличить/уменьшить рабочую область',
                item4: '<kbd>Delete</kbd> - Удалить эпизод',
                item5: '<kbd>C</kbd> - Разделить эпизод',
                item6: '<kbd>V</kbd> - Дублировать эпизод',
                item7: 'Выбор качества, FPS и HDR-режима доступен прямо перед экспортом.',
                item8: 'Для тяжёлых HDR-роликов лучше начать с 720p или 1080p, чтобы быстрее проверить итоговый цвет.'
            },
            founders: {
                github: 'GitHub сервиса: <a class="modal-link" href="https://github.com/ArtemLapys/SkoolHack" target="_blank" rel="noopener noreferrer">github.com/ArtemLapys/SkoolHack</a>',
                creators: 'Создатели сервиса:',
                madeWithLove: 'Создавали с любовью на хакатоне.',
                updated: 'Последнее обновление: 2026'
            },
            export: {
                render: 'Рендер',
                ffmpegNotInitialized: 'FFmpeg не инициализирован. Проверь подключение файла ffmpeg/ffmpeg.js.',
                ffmpegIsolation: 'FFmpeg требует cross-origin isolation. Открой проект через localhost/https и дождись перезагрузки страницы после регистрации COI service worker.',
                buttonReady: 'Экспортировать проект',
                buttonEmpty: 'Сначала добавьте хотя бы один файл на таймлайн',
                hdrFast: 'Быстрый HDR',
                hdrSlow: 'Медленный HDR',
                normalizeImageError: 'Не удалось нормализовать изображение.',
                getSourceError: 'Не удалось получить исходный файл для трека.',
                prepareClipError: 'Не удалось подготовить клип {index}.',
                emptyTimeline: 'Сначала добавьте хотя бы один файл на таймлайн, чтобы начать экспорт.',
                loadingFfmpeg: 'Загрузка FFmpeg',
                preparingClips: 'Подготовка клипов',
                preparingClip: 'Подготовка клипа {current}/{total}',
                preparingClipSlow: 'Подготовка клипа {current}/{total} (видео/HDR может быть медленно)',
                downloadingDone: 'Скачивание 100%',
                finalizing: 'Финализация',
                concatAssembly: 'Склеивание клипов',
                overlayAssembly: 'Склеивание наложений',
                finalVideoError: 'Не удалось собрать итоговое видео.',
                downloading: 'Скачивание',
                renderError: 'Ошибка рендера',
                renderErrorAlert: 'Ошибка рендера. Если снова упадёт, уменьшай maxLongSide или число слоёв.'
            }
        },
        en: {
            seo: {
                title: 'viGu Video Editor — online editing, video export, and HDR processing',
                description: 'viGu Video Editor is a browser-based editor for cutting, duplicating clips, working with images, and exporting video with selectable quality, FPS, and HDR processing.',
                keywords: 'video editor, online video editor, video editing, video export, HDR video, ffmpeg wasm, browser video editor, viGu',
                ogTitle: 'viGu Video Editor',
                ogDescription: 'A browser video editor for timeline editing, HDR export, and fast rendering on the web.',
                twitterTitle: 'viGu Video Editor',
                twitterDescription: 'Edit, export, and process HDR video right in the browser.',
                locale: 'en_US',
                appName: 'viGu Video Editor',
                appDescription: 'A browser video editor for editing, exporting video, working with HDR, and managing a timeline.'
            },
            common: {
                close: 'Close',
                cancel: 'Cancel'
            },
            brand: {
                badge: 'Video Editor',
                hint: 'A video editor for fast editing, export, and HDR processing right in the browser'
            },
            header: {
                navAria: 'Main navigation',
                languageSwitcher: 'Language switcher',
                tools: 'Tools',
                help: 'Help',
                export: 'Export'
            },
            files: {
                title: 'Project Files'
            },
            toolbar: {
                split: 'Split',
                duplicate: 'Duplicate',
                remove: 'Delete',
                splitTitle: 'Split clip',
                duplicateTitle: 'Duplicate clip',
                removeTitle: 'Delete clip',
                toStartTitle: 'Go to start',
                playTitle: 'Play',
                pauseTitle: 'Pause',
                stopTitle: 'Stop',
                zoomInTitle: 'Zoom in',
                zoomOutTitle: 'Zoom out'
            },
            faq: {
                title: 'FAQ',
                lead: 'Short and friendly answers to help you get oriented in the editor faster.',
                q1: {
                    q: 'What can viGu do?',
                    a: 'viGu helps you quickly assemble a video in the browser: upload videos or images, place them on the timeline, trim fragments, duplicate clips, and export the result in the quality you need.'
                },
                q2: {
                    q: 'Why can processing be slow?',
                    a: 'Export runs directly in the browser through FFmpeg WebAssembly. The higher the resolution, FPS, and the more complex the HDR processing, the longer rendering takes. To speed it up, lower the quality, choose 24-30 FPS, or enable fast HDR mode.'
                },
                q3: {
                    q: 'Which HDR mode should I choose?',
                    a: 'Slow mode preserves color better and converts HDR to SDR more smoothly. Fast mode is better when rendering speed matters more. If you want a balance, start with fast mode and switch to slow mode for the final version.'
                },
                q4: {
                    q: 'How should I choose export quality?',
                    a: 'For messengers and quick drafts, 480p or 720p is usually enough. For social media and standard viewing, 1080p is the most common choice. Use 4K only when your source files are truly high quality and you need maximum detail.'
                },
                q5: {
                    q: 'Which FPS should I use?',
                    a: '30 FPS is the universal default. 24 or 25 FPS can reduce file size and speed up export. 60 FPS makes sense for very smooth motion, but it noticeably increases rendering load.'
                },
                q6: {
                    q: 'What should I do if the video looks washed out or too bright?',
                    a: 'This is most often related to HDR footage. Try changing the HDR mode in the export dialog. If the image looks too bright, switch to slow mode. If you need a faster result, use fast mode and check the exported file before publishing.'
                },
                q7: {
                    q: 'How do I get started in the editor?',
                    a: 'First upload your project files, then drag them onto the timeline. After that, trim the unnecessary parts, rearrange clips over time, and start export. If you just want to try it quickly, upload one file and press Export right away.'
                },
                q8: {
                    q: 'How can I request a feature or report a bug?',
                    a: 'If you want to suggest a feature or report a bug, create a discussion in the project GitHub: <a class="modal-link" href="https://github.com/ArtemLapys/SkoolHack/discussions" target="_blank" rel="noopener noreferrer">github.com/ArtemLapys/SkoolHack/discussions</a>. It helps to briefly describe the idea or issue, include reproduction steps, and attach a screenshot or log if possible.'
                }
            },
            footer: {
                text: 'viGu Video Editor is a web tool for editing, exporting, and working with HDR video.',
                update: 'Last updated: 2026',
                hint: 'Click the logo to open the team page, project GitHub, and the list of creators.'
            },
            exportSettings: {
                title: 'Export Settings',
                quality: 'Quality',
                fps: 'FPS',
                hdr: 'HDR Processing',
                hdrSlow: 'Slow',
                hdrFast: 'Fast',
                hdrHint: 'Slow mode preserves HDR color more accurately. Fast mode renders much quicker, but color can be less precise.'
            },
            exportProgress: {
                title: 'Video Export'
            },
            newProject: {
                title: 'Create New Project',
                text1: 'Current files and tracks in the workspace will be removed.',
                text2: 'Do you really want to create a new project?',
                confirm: 'Create'
            },
            deleteFile: {
                title: 'Delete File',
                body: 'Do you really want to delete the file <b><span id="modal-body-span" class="text-break"></span></b>?'
            },
            help: {
                title: 'Help',
                item1: '<kbd>Space</kbd> - Start or stop playback',
                item2: '<kbd>←</kbd> <kbd class="my-2">→</kbd> - Step left/right in the workspace',
                item3: '<kbd>+</kbd> <kbd class="my-2">-</kbd> - Zoom in/out of the workspace',
                item4: '<kbd>Delete</kbd> - Delete clip',
                item5: '<kbd>C</kbd> - Split clip',
                item6: '<kbd>V</kbd> - Duplicate clip',
                item7: 'Quality, FPS, and HDR mode can be selected right before export.',
                item8: 'For heavy HDR videos, it is better to start with 720p or 1080p to check the final color faster.'
            },
            founders: {
                github: 'Service GitHub: <a class="modal-link" href="https://github.com/ArtemLapys/SkoolHack" target="_blank" rel="noopener noreferrer">github.com/ArtemLapys/SkoolHack</a>',
                creators: 'Created by:',
                madeWithLove: 'Built with love during a hackathon.',
                updated: 'Last updated: 2026'
            },
            export: {
                render: 'Rendering',
                ffmpegNotInitialized: 'FFmpeg is not initialized. Check the ffmpeg/ffmpeg.js connection.',
                ffmpegIsolation: 'FFmpeg requires cross-origin isolation. Open the project through localhost/https and reload the page after the COI service worker is registered.',
                buttonReady: 'Export project',
                buttonEmpty: 'Add at least one file to the timeline first',
                hdrFast: 'Fast HDR',
                hdrSlow: 'Slow HDR',
                normalizeImageError: 'Failed to normalize the image.',
                getSourceError: 'Failed to get the source file for the track.',
                prepareClipError: 'Failed to prepare clip {index}.',
                emptyTimeline: 'Add at least one file to the timeline before starting export.',
                loadingFfmpeg: 'Loading FFmpeg',
                preparingClips: 'Preparing clips',
                preparingClip: 'Preparing clip {current}/{total}',
                preparingClipSlow: 'Preparing clip {current}/{total} (video/HDR may be slow)',
                downloadingDone: 'Downloading 100%',
                finalizing: 'Finalizing',
                concatAssembly: 'Merging clips',
                overlayAssembly: 'Merging overlays',
                finalVideoError: 'Failed to assemble the final video.',
                downloading: 'Downloading',
                renderError: 'Render error',
                renderErrorAlert: 'Render error. If it fails again, reduce maxLongSide or the number of layers.'
            }
        }
    };

    let currentLanguage = 'ru';

    function getNestedValue(source, path) {
        return String(path || '')
            .split('.')
            .reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), source);
    }

    function interpolate(template, vars = {}) {
        return String(template).replace(/\{(\w+)\}/g, (_, key) => {
            return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`;
        });
    }

    function t(key, vars = {}, fallback = key) {
        const value = getNestedValue(translations[currentLanguage], key);
        if (typeof value === 'string') {
            return interpolate(value, vars);
        }
        return fallback;
    }

    function updateSeo() {
        const seo = translations[currentLanguage].seo;
        document.documentElement.lang = currentLanguage;
        document.head.lang = currentLanguage;

        const mappings = [
            ['meta-title', seo.title, 'textContent'],
            ['meta-description', seo.description, 'content'],
            ['meta-keywords', seo.keywords, 'content'],
            ['meta-og-locale', seo.locale, 'content'],
            ['meta-og-title', seo.ogTitle, 'content'],
            ['meta-og-description', seo.ogDescription, 'content'],
            ['meta-og-site-name', seo.appName, 'content'],
            ['meta-twitter-title', seo.twitterTitle, 'content'],
            ['meta-twitter-description', seo.twitterDescription, 'content']
        ];

        mappings.forEach(([id, value, field]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el[field] = value;
        });

        const appLd = document.getElementById('ld-app');
        if (appLd) {
            appLd.textContent = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: seo.appName,
                applicationCategory: 'MultimediaApplication',
                operatingSystem: 'Web',
                description: seo.appDescription,
                url: 'https://github.com/ArtemLapys/SkoolHack',
                author: {
                    '@type': 'Organization',
                    name: 'RED Dynasty'
                }
            }, null, 2);
        }

        const faqLd = document.getElementById('ld-faq');
        if (faqLd) {
            faqLd.textContent = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [1, 2, 3].map(index => ({
                    '@type': 'Question',
                    name: t(`faq.q${index}.q`),
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: t(`faq.q${index}.a`).replace(/<[^>]+>/g, '')
                    }
                }))
            }, null, 2);
        }
    }

    function applyTranslations(root = document) {
        root.querySelectorAll('[data-i18n]').forEach(node => {
            const key = node.getAttribute('data-i18n');
            node.textContent = t(key);
        });

        root.querySelectorAll('[data-i18n-html]').forEach(node => {
            const key = node.getAttribute('data-i18n-html');
            node.innerHTML = t(key);
        });

        root.querySelectorAll('[data-i18n-attr]').forEach(node => {
            const config = node.getAttribute('data-i18n-attr');
            config.split(',').forEach(item => {
                const [attr, key] = item.split(':').map(part => part.trim());
                if (!attr || !key) return;
                node.setAttribute(attr, t(key));
            });
        });

        document.querySelectorAll('.language-switcher__button').forEach(button => {
            button.classList.toggle('is-active', button.dataset.lang === currentLanguage);
        });

        updateSeo();
    }

    function normalizeLanguage(lang) {
        const short = String(lang || '').toLowerCase().slice(0, 2);
        return SUPPORTED_LANGS.includes(short) ? short : 'en';
    }

    function detectInitialLanguage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
        return normalizeLanguage(navigator.language || navigator.userLanguage || 'en');
    }

    function setLanguage(lang, options = {}) {
        currentLanguage = normalizeLanguage(lang);
        applyTranslations();

        if (options.persist !== false) {
            localStorage.setItem(STORAGE_KEY, currentLanguage);
        }

        window.dispatchEvent(new CustomEvent('vigu:languagechange', {
            detail: { lang: currentLanguage }
        }));
    }

    function getLanguage() {
        return currentLanguage;
    }

    function bindSwitcher() {
        document.querySelectorAll('.language-switcher__button').forEach(button => {
            button.addEventListener('click', () => {
                setLanguage(button.dataset.lang, { persist: true });
            });
        });
    }

    currentLanguage = detectInitialLanguage();

    window.i18n = {
        t,
        setLanguage,
        getLanguage,
        applyTranslations
    };

    document.addEventListener('DOMContentLoaded', () => {
        bindSwitcher();
        setLanguage(currentLanguage, { persist: false });
    });
})();
