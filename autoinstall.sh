git clone https://github.com/isuvorov/bash ~/bash && \
echo "\n. ~/bash/.bash" >> ~/.bash && \
touch .hushlogin && \
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k && \
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions && \
echo "\n. ~/bash/.zshrc" >> ~/.zshrc && \