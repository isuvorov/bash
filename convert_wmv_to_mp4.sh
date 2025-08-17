#!/bin/bash


# Переход в папку
cd "$INPUT_DIR" || exit

# Перебираем все .wmv файлы
for file in *.wmv; do
    # Создаём имя для выходного файла (заменяем .wmv на .mp4)
    output="${file%.wmv}.mp4"
    
    # Запускаем конвертацию
    # ffmpeg -i "$file" -c:v libx265 -preset slow -crf 28 -c:a libmp3lame -b:a 96k "$output"
    ffmpeg -i "$file" -c:v libx265 -preset slow -crf 28 -c:a libmp3lame -b:a 96k "$output"

    
    # Удаляем оригинал, если конвертация прошла успешно
    if [ $? -eq 0 ]; then
        rm "$file"
    fi
done