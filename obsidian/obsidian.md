# Obsidian Aliases

Открытие Markdown файлов в Obsidian. Работает даже с файлами вне хранилища — автоматически создаёт симлинки.

## Алиасы

| Алиас | Описание                   |
| ----- | -------------------------- |
| `ob`  | Открыть файл(ы) в Obsidian |
| `obs` | Открыть файл(ы) в Obsidian |

## Использование

```bash
ob file.md
obs doc1.md doc2.md
```

## Особенности

- Открывает только `.md` файлы
- Сохраняет структуру директорий в `Temp/` относительно `~/projects/` или `~`
  - `~/projects/asd/xcv/ss.md` → `Temp/asd/xcv/ss.md`
  - `~/docs/file.md` → `Temp/docs/file.md`
- Автоматически линкует связанные файлы (изображения и т.д.)

## См. также

- [Red Graphite](https://github.com/seanwcom/Red-Graphite-for-Obsidian) — минималистичная тема для Obsidian
- Шрифты Bear Sans UI: `/Applications/Bear.app/Contents/Resources/BearSansUI-Regular.otf`
- https://www.storyspooler.com/make-obsidian-look-like-bear-2/

## Credits

Inspired by [obsidian-everywhere](https://gitlab.com/BvdG/obsidian-everywhere/-/blob/main/open-in-obsidian.sh)
