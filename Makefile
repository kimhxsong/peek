PACKAGE_NAME ?= ai-ui-inspector
OUT_DIR ?= dist
ZIP ?= zip

.PHONY: package clean

package:
	@mkdir -p $(OUT_DIR)
	@echo "Packing $(PACKAGE_NAME) into $(OUT_DIR)/$(PACKAGE_NAME).zip"
	@$(ZIP) -r $(OUT_DIR)/$(PACKAGE_NAME).zip manifest.json src -x "**/.DS_Store"

clean:
	@rm -rf $(OUT_DIR)
