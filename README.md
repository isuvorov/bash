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

### 3. Install oh-my-zsh

See: https://github.com/ohmyzsh/ohmyzsh
```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 4. Install Powerlevel9k theme and zsh-autosuggestions plugin

See: https://github.com/Powerlevel9k/powerlevel9k/wiki/Install-Instructions#step-1-install-powerlevel9k
```sh
git clone https://github.com/bhilburn/powerlevel9k.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/themes/powerlevel9k
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

### 5. add `. ~/bash/.zshrc` in `~/.zshrc`

```sh
echo "\n. ~/bash/.zshrc" >> ~/.zshrc
```

### 6. Restart the terminal and enjoy :)

### Tips

`touch .hushlogin` - скрыть сообщение про last login
