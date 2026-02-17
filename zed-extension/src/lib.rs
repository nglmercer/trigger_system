use zed_extension_api as zed;

struct TriggerSystemExtension;

impl zed::Extension for TriggerSystemExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command, String> {
        // Find node in the PATH
        let node_path = worktree
            .which("node")
            .ok_or_else(|| "node executable not found in PATH. Please install Node.js.".to_string())?;

        // 1. Get the worktree root path (for development mode)
        let worktree_root = worktree.root_path();
        let worktree_dir = std::path::Path::new(&worktree_root);
        
        // 2. Identify potential LSP bundle locations
        // - Development: When running from the repo, it's in vscode-extension/dist/lsp/
        // - Production: When installed as an extension, it's in the extension root
        let lsp_paths = [
            worktree_dir.join("vscode-extension/dist/lsp/server.bundle.js"),
            std::path::PathBuf::from("server.bundle.js"),
            // In some environments, it might be at /server.bundle.js
            std::path::PathBuf::from("/server.bundle.js"),
        ];
        
        let mut lsp_path = None;
        for path in &lsp_paths {
            if path.exists() {
                lsp_path = Some(path.clone());
                break;
            }
        }
        
        // Final fallback: try to find it in the current directory if path.exists() is unreliable
        let lsp_path = match lsp_path {
            Some(path) => path,
            None => {
                // If we couldn't find it via exists(), check if we can at least return a likely path
                // or provide a very detailed error message.
                return Err(format!(
                    "Trigger System LSP not found.\nSearched in:\n1. {:?}\n2. server.bundle.js\n3. /server.bundle.js\n\nEnsure 'bun run build:lsp' was run and the bundle is in the extension folder.",
                    lsp_paths[0]
                ));
            }
        };
        
        Ok(zed::Command {
            command: node_path,
            args: vec![
                lsp_path.to_string_lossy().to_string(),
                "--stdio".to_string(),
            ],
            env: Default::default(),
        })
    }
}

zed::register_extension!(TriggerSystemExtension);
