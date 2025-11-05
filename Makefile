.PHONY: update

define updateGame
	aws s3 cp $(1) s3://psychological-experiments/$(1) --recursive --profile home
endef

BUCKET :=  s3://psychological-experiments

update:
	@$(call updateGame,"sdltnt")
	@$(call updateGame,"bart")
	@$(call updateGame,"hanoi")
	@$(call updateGame,"srtt")
	@$(call updateGame,"tmt")
	@$(call updateGame,"nback")
	@$(call updateGame,"gonogo")
	@$(call updateGame,"sdst")
	@$(call updateGame,"wcst")
	@$(call updateGame,"cdt")
	@$(call updateGame,"rlt")
	aws s3 cp index.html $(BUCKET) --profile home
	aws s3 cp js/main.js $(BUCKET)/js/main.js --profile home
	aws s3 cp psyexp_core.js $(BUCKET) --profile home
