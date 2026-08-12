# Install Ruby and Jekyll on Windows

This guide prepares a Windows machine to build and preview the Alexander Kluev
GitHub Pages site locally. The site is published by GitHub Pages from the root
of the `master` branch.

## 1. Install Ruby

Install the latest **Ruby+Devkit 3.3.x (x64)** package from:

<https://rubyinstaller.org/downloads/>

Ruby 3.3 is recommended because it closely matches the Ruby version used by
GitHub Pages. Use the default installer options and make sure Ruby is added to
`PATH`.

At the end of the installation, allow the installer to run `ridk install`.
Select the option that installs **MSYS2 and the MINGW development toolchain**.
The toolchain is needed by Ruby gems that contain native extensions.

Close all open terminals after installation and start a new Git Bash terminal.
Verify the installation:

```bash
ruby -v
gem -v
ridk version
```

## 2. Install Bundler

Install Bundler from Git Bash:

```bash
gem install bundler
bundle -v
```

The repository's `Gemfile` uses the `github-pages` gem so that local Jekyll and
plugin versions remain aligned with the GitHub Pages build environment.

## 3. Clone and prepare the site

Choose a local parent directory, clone the repository, and enter it:

```bash
mkdir -p /c/repo/github
cd /c/repo/github
git clone https://github.com/akluev/akluev.github.io.git
cd akluev.github.io
```

Install the locked Ruby dependencies:

```bash
bundle install
```

Run this command again whenever `Gemfile` or `Gemfile.lock` changes.

## 4. Validate the site manually

Build the site with strict front-matter validation:

```bash
bundle exec jekyll build --strict_front_matter --trace
```

Jekyll writes the generated site to `_site/`. That directory is ignored by Git
and must not be committed.

To preview the site:

```bash
bundle exec jekyll serve --livereload
```

Open <http://127.0.0.1:4000/> in a browser. Press `Ctrl+C` in the terminal to
stop the server.

## 5. Use Git Bash in VS Code

In VS Code:

1. Open the Command Palette with `Ctrl+Shift+P`.
2. Run **Terminal: Select Default Profile**.
3. Select **Git Bash**.
4. Open a new terminal.

If Git Bash is not listed, confirm that Git for Windows is installed and
restart VS Code.

## 6. Add convenient blog commands

The recommended commands are:

- `blogbuild` -- validate and build the site.
- `blogserve` -- build, serve, and live-reload the site at
  `http://127.0.0.1:4000/`.

These are Bash functions rather than simple aliases because they must locate
the repository root when invoked from a subdirectory.

Open `~/.bashrc` in Git Bash and append the following block:

```bash
_ak_blog_root() {
    local root

    root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
        echo "Not inside a Git repository." >&2
        return 1
    }

    if [[ ! -f "$root/_config.yml" ]] ||
       [[ ! -f "$root/Gemfile" ]] ||
       ! grep -Eq '^url:[[:space:]]*https://akluev\.github\.io[[:space:]]*$' "$root/_config.yml"; then
        echo "Not inside the akluev.github.io repository." >&2
        return 1
    fi

    printf '%s\n' "$root"
}

blogbuild() {
    local root
    root="$(_ak_blog_root)" || return
    (cd "$root" && bundle exec jekyll build --strict_front_matter --trace)
}

blogserve() {
    local root
    root="$(_ak_blog_root)" || return
    (cd "$root" && bundle exec jekyll serve --livereload)
}
```

Reload the Bash configuration without restarting VS Code:

```bash
source ~/.bashrc
```

You can now run `blogserve` from the repository root or anywhere below it, for
example from `_posts/` or `assets/documents/`. The function changes directory
only inside a subshell, so your terminal remains in its original directory when
Jekyll stops.

Do not redefine the standard `ls` command for this purpose. Keeping `ls` as the
directory-listing command avoids surprising behavior in this and every other
repository.

## 7. Troubleshooting

If Ruby is not found, close and reopen VS Code so it receives the updated
Windows `PATH`.

If a native gem fails to install, run:

```bash
ridk install
bundle install
```

If Jekyll reports a character-encoding error, switch the Windows console to
UTF-8 before building:

```bash
chcp.com 65001
blogbuild
```

If port 4000 is already in use, select another port:

```bash
bundle exec jekyll serve --livereload --port 4001
```

## References

- [GitHub: Testing a GitHub Pages site locally](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll)
- [GitHub Pages dependency versions](https://pages.github.com/versions/)
- [Jekyll on Windows](https://jekyllrb.com/docs/installation/windows/)
- [RubyInstaller downloads](https://rubyinstaller.org/downloads/)
