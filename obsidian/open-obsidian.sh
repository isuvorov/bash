#!/usr/bin/env bash
# Open a Markdown file in Obsidian

# CONFIGURATION
vault_where_files_must_be_opened=
subtrees_that_must_be_mirrored_in_vault=(

)

# Utility functions
get_linked_files() {
	# Also create symlinks to local files, like images, to which the Markdown file links
	md_dir="$(dirname "$1")"
	# Obsidian 1.0.0 doesn't display <img src="..."> but perhaps a future version will
	sed -En -e 's/.*\[[^]]*\]\(([^"]+)[^)]*\).*/\1/p' \
			-e 's/.*<img[^>]* src="([^?"]+)("|\?).*/\1/p' <"$1" |
		while IFS= read -r linktext
		do
			linked_file="$(readlink -f "$md_dir/${linktext% }" || \
				readlink "$md_dir/${linktext% }")"  # on macOS 10.15 -f is not allowed
			# is it really a local file, and not higher up in the file tree?
			if [[ $? &&  "$linked_file" == "$md_dir"* ]]
			then
				link_dir=$2
				# create subdirs if needed
				abs_dir="$(dirname "$linked_file")"
				if [[ "$md_dir" != "$abs_dir" ]]
				then
					link_dir="$link_dir${abs_dir#$md_dir}"
					mkdir -p "$link_dir"
				fi
				linkpath="$link_dir/$(basename "$linked_file")"
				[[ ! -e "$linkpath" ]] && ln -s "$linked_file" "$linkpath"
			fi
		done
}

open_file() {
	# Thanks, https://stackoverflow.com/a/75300235/7840347
	url_encoded="$(perl -e 'use URI; print URI->new("'"$1"'");')"
	if [[ -z $url_encoded ]]; then url_encoded="$1"; fi   # in case perl returns nothing
	open "obsidian://open?path=$url_encoded&paneType=tab"
}


# Main script
IFS=$'\n' all_vaults=($(awk -F':|,|{|}|"' '{for(i=1;i<=NF;i++)if($i=="path")print$(i+3)}'\
   <"$HOME/Library/Application Support/obsidian/obsidian.json"))
default_vault="$(readlink -f "$vault_where_files_must_be_opened")" || \
default_vault="$(readlink "$vault_where_files_must_be_opened")" || \
# on macOS 10.15 -f is not allowed with readlink
default_vault="$(sed -E 's/.*"path":"([^"]+)",.*"open":true.*/\1/'\
   <"$HOME/Library/Application Support/obsidian/obsidian.json")"  # currently active vault

for file in "$@"
do
	# check for existence and readability
	if [[ (! -f "$file") || (! -r "$file") ]]
	then
		logger "OPEN-IN-OBSIDIAN warning: No readable file $file"
		continue
	fi
	# only allow .md files
	if [[ "$file" != *.md ]]
	then
		logger "OPEN-IN-OBSIDIAN warning: Only .md files are allowed: $file"
		continue
	fi
	abspath=$(readlink -f "$file" || readlink "$file")  # on macOS 10.15 -f is not allowed

	# 1. If the file is inside any vault (in place or linked), just open it
	for v in "${all_vaults[@]}"
	do
		foundpath="$(find -L "$v" -samefile "$abspath" -and ! -path "*/.trash/*")"
		if [[ $foundpath ]]
		then
			open_file "$foundpath"
			continue 2  # next input file
		fi
	done
	
	# 2. If it's in one of the folders that should be mirrored,
	#    replicate the folder's internal directory chain in the vault
	#    and put a link to the file in it; then open that
	for base in "${subtrees_that_must_be_mirrored_in_vault[@]}"
	do
		if [[ "$abspath" == "$base"* ]]
		then
			linkpath="$default_vault/$(basename "$base")${abspath#$base}"
			mkdir -p "$(dirname "$linkpath")"
			ln -s "$abspath" "$linkpath"			
			get_linked_files "$abspath" "$(dirname "$linkpath")"
			sleep 1  # delay for Obsidian to notice the new file(s)
			open_file "$linkpath"
			continue 2
		fi
	done

	# 3. In other cases, create a uniquely named symlink in the Temp folder and open it
	#    preserving directory structure relative to ~/projects/ or ~
	if [[ "$abspath" == "$HOME/projects/"* ]]; then
		relpath="${abspath#$HOME/projects/}"
	elif [[ "$abspath" == "$HOME/"* ]]; then
		relpath="${abspath#$HOME/}"
	else
		relpath="$(basename "$abspath")"
	fi
	linkpath="$default_vault/Temp/$relpath"
	mkdir -p "$(dirname "$linkpath")"
	while [[ -e "$linkpath" ]]  # don't overwrite existing symlinks: choose a unique name
	do
		linkpath="${linkpath%.*}_$RANDOM.${linkpath##*.}"
	done
	ln -s "$abspath" "$linkpath"
	get_linked_files "$abspath" "$(dirname "$linkpath")"
	sleep 1
	open_file "$linkpath"
done

# # Bash completion - только .md файлы
# _open_obsidian_completion() {
# 	local cur="${COMP_WORDS[COMP_CWORD]}"
# 	local IFS=$'\n'
# 	COMPREPLY=($(compgen -f -X '!*.md' -- "$cur"))
# 	# Добавляем директории для навигации
# 	COMPREPLY+=($(compgen -d -- "$cur"))
# }

# # Регистрируем completion для алиасов
# complete -o filenames -F _open_obsidian_completion ob
# complete -o filenames -F _open_obsidian_completion obs
# complete -o filenames -F _open_obsidian_completion open-obsidian
