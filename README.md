# xg-command-loon
xg-command-loon pulgin

## Usage
```shell
cd $project_dir
xg loon
# or
xg-command-loon
```

### Config
> env -> remote -> file

- Environment Config
```shell
XG_LOON="config" xg-command-loon [--config-env="XG_LOON"]
```
- Remove Config
```shell
XG_LOON_REMOTE="url" xg-command-loon [--config-remote="XG_LOON_REMOTE"]
```
- Local File Config
```shell
xg-command-loon --config-file=".xg.loon.config"
```

### Hooks
default hook

#### Custom Hook
```json
{
  "config": {
    "loon": {
      "scripts": {
        "preinstall": "./loon-preinstall-hooks.js",
        "postinstall": false
      }
    }
  }
}
```

## Development
### command
#### demo
```shell
xg-command-loon demo LOON_SIGN --basename=basename --tmpdir=tmpdir --port=8080 --framework=angular
```

#### dev
```shell
xg-command-loon dev --port=6000 --config=loon.config --tmpdir=tmpdir --framework=angular
```

### loon.config
```json
{
  "module_entry": "module_entry_dir_basename",
  "module_dependencies": [
    "module_dependency_a_dir_basename",
    "module_dependency_b_dir_basename"
  ]
}
```
