exports = module.exports = loon_response => {
  return {
    module_entry: loon_response.module_entry,
    module_dependencies: Object.keys(loon_response.module_dependencies).filter(i => i !== loon_response.module_entry)
  };
};
