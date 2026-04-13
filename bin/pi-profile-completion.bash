#===============================================================================
# pi-profile shell integration
# 
# Source this file in your .bashrc / .zshrc for profile-aware shell prompts
# and tab completion.
#
# Add to ~/.bashrc or ~/.zshrc:
#   source ~/.pi/bin/pi-profile-completion.sh
#===============================================================================

# Get current profile name
pi-profile-current() {
    local profile_file="$HOME/.pi/current-profile"
    if [[ -f "$profile_file" ]]; then
        cat "$profile_file"
    else
        echo "default"
    fi
}

# Get profile directory
pi-profile-dir() {
    local name="${1:-$(pi-profile-current)}"
    if [[ "$name" == "default" ]]; then
        echo "$HOME/.pi/agent"
    else
        echo "$HOME/.pi/profiles/$name"
    fi
}

# Shell prompt indicator
pi-profile-prompt() {
    local current
    current=$(pi-profile-current)
    if [[ "$current" != "default" ]]; then
        echo "[$current] "
    fi
}

# Aliases for quick switching
alias pp='pi-profile'
alias ppl='pi-profile list'
alias ppc='pi-profile create'
alias ppu='pi-profile use'
alias pps='pi-profile show'

# Quick profile wrappers
alias pw='PI_PROFILE=work pi'
alias pp='PI_PROFILE=personal pi'

# Change to profile directory
pcd() {
    local dir
    dir=$(pi-profile-dir "${1:-}")
    if [[ -d "$dir" ]]; then
        cd "$dir" || return
        echo "Changed to profile: $(pi-profile-current)"
    else
        echo "Profile not found: ${1:-}"
        return 1
    fi
}

# List profile sessions
psessions() {
    local dir
    dir=$(pi-profile-dir "${1:-}")
    if [[ -d "$dir/sessions" ]]; then
        ls -lt "$dir/sessions"/*.jsonl 2>/dev/null | head -20 || echo "No sessions"
    else
        echo "No sessions directory"
    fi
}

# Tab completion for pi-profile
_pi-profile-completion() {
    local cur prev subcommands profiles
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    subcommands="list create use show delete rename copy export import shell edit help wrapper"

    # If first arg, provide subcommands or profiles
    if [[ $COMP_CWORD -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
        return 0
    fi

    # Get list of profiles
    profiles=$(pi-profile list 2>/dev/null | grep -E "^\s+\S" | awk '{print $2}' | grep -v "^$")

    # Subcommands that need profile name
    case "${COMP_WORDS[1]}" in
        create|use|show|delete|shell|edit)
            COMPREPLY=($(compgen -W "default $profiles" -- "$cur"))
            ;;
        rename)
            if [[ $COMP_CWORD -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$profiles" -- "$cur"))
            elif [[ $COMP_CWORD -eq 3 ]]; then
                COMPREPLY=($(compgen -W "default $profiles" -- "$cur"))
            fi
            ;;
        copy)
            if [[ $COMP_CWORD -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$profiles" -- "$cur"))
            elif [[ $COMP_CWORD -eq 3 ]]; then
                COMPREPLY=($(compgen -W "$profiles" -- "$cur"))
            fi
            ;;
        export|import)
            COMPREPLY=($(compgen -W "$profiles" -- "$cur"))
            ;;
    esac

    return 0
}

complete -F _pi-profile-completion pi-profile

# Add to prompt (add to your PS1)
# Example: export PS1="$(pi-profile-prompt)$PS1"

echo "pi-profile loaded. Use 'pp' for 'pi-profile', 'ppl' for list, etc."
echo "Quick access: 'pw' for work profile, 'pp' for personal profile"
