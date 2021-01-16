# Bash configs
Bash aliases, zsh/oh-my-zsh config and shell utilites

### 1. clone repo in home
```sh
cd ~
git clone https://github.com/isuvorov/bash
```

### 2. add `. ~/bash/.bash` in `~/.bash`

```sh
echo "\n. ~/bash/.bash" >> ~/.bash
```

*Tips*: How to disable messages about "last login"

```sh
touch .hushlogin
``


### 3. Install oh-my-zsh

See: https://github.com/ohmyzsh/ohmyzsh
```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 4. Install Powerlevel9k theme and zsh-autosuggestions plugin

See: https://github.com/Powerlevel9k/powerlevel9k/wiki/Install-Instructions#step-1-install-powerlevel9k
```sh
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

### 5. add `. ~/bash/.zshrc` in `~/.zshrc`

```sh
echo "\n. ~/bash/.zshrc" >> ~/.zshrc
```

### 6. iTerm2  (Bonus)

Install [iTerm2](https://iterm2.com/) if you dont have.

iTerm2 Preferences > Tab General > Sub Tab Preferences > Load preferences ... > enable

fill `~/bash/iterm`


### 7. Restart the terminal and enjoy :)
