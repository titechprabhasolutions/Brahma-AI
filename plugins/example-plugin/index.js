module.exports = {
  id: "example-plugin",
  onCommand: async (text) => {
    if (text.toLowerCase().includes("hello plugin")) {
      return "Plugin says hi!";
    }
    return null;
  }
};
