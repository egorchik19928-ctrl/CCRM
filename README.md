# CCRM — «Резюме (просто)» v0.5

Упрощённое десктоп-приложение (Electron):

1. **Эталонный DOCX** — из `word/styles.xml` и `word/document.xml` извлекаются базовый шрифт, размер (половинки pt) и поля страницы (`w:pgMar`).
2. **DOCX с текстом** — содержимое конвертируется через Mammoth в HTML и переносится в новый документ с параметрами эталона.
3. **Логотип** — PNG/JPG в шапке экспортируемого DOCX.

Если эталон не выбран, стиль берётся из файла с текстом.

## Сборка

```bash
npm install
npm run build:win   # portable .exe под Windows
```

Артефакт для скачивания: `artifacts/ResumeSimple-v0.5-Windows-x64.zip` (после сборки).

## Разработка

```bash
npm install
npm run dev
npm test
npm run typecheck
```

## Дизайн

Интерфейс десктопа оформлен в тёмной «glass» теме (Tailwind): градиентный фон, карточки с размытием, пошаговые кнопки.

## Шрифты из эталона

`extractDocxTheme` читает:

1. Первый осмысленный `w:r` в `word/document.xml` (включая `w:asciiTheme` → `word/theme/theme1.xml`).
2. Стиль **Normal** в `word/styles.xml`.
3. **docDefaults** в `word/styles.xml`.
4. Латинские шрифты **major/minor** из темы.

В статусе и карточке «Текущий стиль» показывается, откуда взят шрифт и размер (`body-run`, `normal-style`, …).

## PDF

Файл `.pdf` **не** используется для извлечения шрифтов. Для совпадения с «идеальным» резюме экспортируйте его в **.docx** и выберите как эталон.
