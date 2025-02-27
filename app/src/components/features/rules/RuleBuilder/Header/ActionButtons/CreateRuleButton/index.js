import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Tooltip } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "utils/Toast.js";
//UTILS
import {
  getAppMode,
  getCurrentlySelectedRuleData,
  getIsCurrentlySelectedRuleHasUnsavedChanges,
  getUserAuthDetails,
} from "../../../../../../../store/selectors";
import { trackRQLastActivity } from "../../../../../../../utils/AnalyticsUtils";
//Actions
import { saveRule } from "../actions";
import { getModeData, setIsCurrentlySelectedRuleHasUnsavedChanges } from "../../../actions";
import { transformAndValidateRuleFields, validateRule } from "./actions";

import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
import APP_CONSTANTS from "../../../../../../../config/constants";
import { redirectToRuleEditor } from "utils/RedirectionUtils";
import { getAllRedirectDestinationTypes, getAllResponseBodyTypes } from "utils/rules/misc";
import { ruleModifiedAnalytics } from "./actions";
import {
  trackErrorInRuleCreation,
  trackRuleCreatedEvent,
  trackRuleEditedEvent,
  trackRuleResourceTypeSelected,
  trackRuleSaveClicked,
} from "modules/analytics/events/common/rules";
import { snakeCase } from "lodash";
import ruleInfoDialog from "./RuleInfoDialog";
import { ResponseRuleResourceType } from "types/rules";
import { runMinorFixesOnRule } from "utils/rules/misc";
import { PremiumFeature } from "features/pricing";
import { FeatureLimitType } from "hooks/featureLimiter/types";
import { isExtensionInstalled } from "actions/ExtensionActions";
import { actions } from "store";
import "../RuleEditorActionButtons.css";
import { HTML_ERRORS } from "./actions/insertScriptValidators";
import { toastType } from "components/misc/CodeEditor/EditorToast/types";

const getEventParams = (rule) => {
  const eventParams = {};
  switch (rule.ruleType) {
    case GLOBAL_CONSTANTS.RULE_TYPES.SCRIPT:
      eventParams.num_characters = rule.pairs[0].scripts.reduce((max, currentScript) => {
        const currentScriptLen = currentScript.value.length;
        return currentScriptLen > max ? currentScriptLen : max;
      }, rule.pairs[0].scripts[0]?.value?.length);
      break;
    case GLOBAL_CONSTANTS.RULE_TYPES.RESPONSE:
      eventParams.num_characters = rule.pairs[0].response?.value?.length;
      break;
    case GLOBAL_CONSTANTS.RULE_TYPES.REQUEST:
      eventParams.num_characters = rule.pairs[0].request?.value?.length;
      break;
    case GLOBAL_CONSTANTS.RULE_TYPES.HEADERS: {
      const headerTypes = new Set();
      const headerActions = new Set();
      rule.pairs.some((pair) => {
        if (pair.modifications?.Response?.length > 0) {
          headerTypes.add("Response");
        }
        if (pair.modifications?.Request?.length > 0) {
          headerTypes.add("Request");
        }
        pair.modifications?.Response?.forEach((responseHeader) => {
          headerActions.add(responseHeader.type);
        });
        pair.modifications?.Request?.forEach((requestHeader) => {
          headerActions.add(requestHeader.type);
        });
        if (headerTypes.size === 2 && headerActions.size === 3) {
          return true;
        }
        return false;
      });
      eventParams.header_types = Array.from(headerTypes);
      eventParams.header_actions = Array.from(headerActions);
      break;
    }
    default:
      return eventParams;
  }
  return eventParams;
};

// This is also the save rule button
const CreateRuleButton = ({
  location,
  isDisabled = false,
  isRuleEditorModal = false, // indicates if rendered from rule editor modal
  analyticEventRuleCreatedSource = "rule_editor_screen_header",
  ruleCreatedFromEditorModalCallback = (ruleId) => {},
  ruleEditorModalMode = APP_CONSTANTS.RULE_EDITOR_CONFIG.MODES.CREATE,
}) => {
  //Constants
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ruleCreatedEventSource = searchParams.get("source") ?? analyticEventRuleCreatedSource;
  const MODE = isRuleEditorModal ? ruleEditorModalMode : getModeData(location).MODE;

  //Global State
  const dispatch = useDispatch();
  const currentlySelectedRuleData = useSelector(getCurrentlySelectedRuleData);
  const isCurrentlySelectedRuleHasUnsavedChanges = useSelector(getIsCurrentlySelectedRuleHasUnsavedChanges);
  // const rules = getAllRules(state);
  const user = useSelector(getUserAuthDetails);
  const appMode = useSelector(getAppMode);

  const tooltipText = isDisabled
    ? "Only available in desktop app."
    : navigator.platform.match("Mac")
    ? "⌘+S"
    : "Ctrl+S";

  const currentActionText = MODE === APP_CONSTANTS.RULE_EDITOR_CONFIG.MODES.EDIT ? "Save" : "Create";

  const handleBtnOnClick = async (saveType) => {
    trackRuleSaveClicked(MODE);
    if (appMode !== GLOBAL_CONSTANTS.APP_MODES.DESKTOP && !isExtensionInstalled()) {
      dispatch(actions.toggleActiveModal({ modalName: "extensionModal", newValue: true }));
      return;
    }

    const createdBy = currentlySelectedRuleData?.createdBy || user?.details?.profile?.uid || null;
    const currentOwner = user?.details?.profile?.uid || null;
    const lastModifiedBy = user?.details?.profile?.uid || null;

    //Pre-validation: regex fix + trim whitespaces
    const fixedRuleData = runMinorFixesOnRule(dispatch, currentlySelectedRuleData);
    //Syntactic Validation
    const syntaxValidation = await transformAndValidateRuleFields(fixedRuleData);
    if (!syntaxValidation.success) {
      const validationError = syntaxValidation.validationError;
      switch (validationError.error) {
        case HTML_ERRORS.COULD_NOT_PARSE:
        case HTML_ERRORS.UNCLOSED_TAGS:
        case HTML_ERRORS.UNCLOSED_ATTRIBUTES:
        case HTML_ERRORS.UNSUPPORTED_TAGS:
        case HTML_ERRORS.MULTIPLE_TAGS:
        case HTML_ERRORS.NO_TAGS:
          dispatch(
            actions.triggerToastForEditor({
              id: validationError.pairId,
              message: validationError.message,
              type: toastType.ERROR,
              autoClose: 4500,
            })
          );
          break;
        default:
          toast.error(validationError.message || "Could Not Parse rule");
          break;
      }
    } else {
      const parsedRuleData = syntaxValidation.ruleData || currentlySelectedRuleData;
      //Validation
      const ruleValidation = validateRule(parsedRuleData, dispatch, appMode);
      if (ruleValidation.result) {
        saveRule(
          appMode,
          {
            ...parsedRuleData,
            createdBy,
            currentOwner,
            lastModifiedBy,
          },
          // updating `isCurrentlySelectedRuleHasUnsavedChanges` in the callback of saveRule
          // because the navigation blocker prompt is dependent on this value so we need to
          // update it before navigating away from the page
          () => setIsCurrentlySelectedRuleHasUnsavedChanges(dispatch, false)
        )
          .then(async () => {
            if (isRuleEditorModal) {
              ruleCreatedFromEditorModalCallback(currentlySelectedRuleData.id);
            } else {
              toast.success(`Successfully ${currentActionText.toLowerCase()}d the rule`);
            }

            /* @sahil865gupta: Testing GA4 events and blending BQ data. Move this to separate module*/

            let rule_type = null;

            if (currentlySelectedRuleData && currentlySelectedRuleData.ruleType) {
              rule_type = currentlySelectedRuleData.ruleType;
            }
            if (MODE === APP_CONSTANTS.RULE_EDITOR_CONFIG.MODES.CREATE || isRuleEditorModal) {
              ruleInfoDialog(currentlySelectedRuleData.ruleType, appMode);
              trackRuleCreatedEvent({
                rule_type,
                description: currentlySelectedRuleData.description,
                destination_types:
                  currentlySelectedRuleData.ruleType === GLOBAL_CONSTANTS.RULE_TYPES.REDIRECT
                    ? getAllRedirectDestinationTypes(currentlySelectedRuleData)
                    : null,
                source: ruleCreatedEventSource,
                body_types:
                  currentlySelectedRuleData.ruleType === GLOBAL_CONSTANTS.RULE_TYPES.RESPONSE
                    ? getAllResponseBodyTypes(currentlySelectedRuleData)
                    : null,
                ...getEventParams(currentlySelectedRuleData),
                save_type: saveType,
              });
            } else if (MODE === APP_CONSTANTS.RULE_EDITOR_CONFIG.MODES.EDIT) {
              trackRuleEditedEvent({
                rule_type,
                description: currentlySelectedRuleData.description,
                destination_types:
                  currentlySelectedRuleData.ruleType === GLOBAL_CONSTANTS.RULE_TYPES.REDIRECT
                    ? getAllRedirectDestinationTypes(currentlySelectedRuleData)
                    : null,
                source: ruleCreatedEventSource,
                ...getEventParams(currentlySelectedRuleData),
                save_type: saveType,
              });
            }
            ruleModifiedAnalytics(user);
            trackRQLastActivity("rule_saved");

            if (currentlySelectedRuleData?.ruleType === GLOBAL_CONSTANTS.RULE_TYPES.RESPONSE) {
              const resourceType = currentlySelectedRuleData?.pairs?.[0]?.response?.resourceType;

              if (resourceType && resourceType !== ResponseRuleResourceType.UNKNOWN) {
                trackRuleResourceTypeSelected(GLOBAL_CONSTANTS.RULE_TYPES.RESPONSE, snakeCase(resourceType));
              }
            }
          })
          .then(() => {
            if (!isRuleEditorModal) {
              redirectToRuleEditor(navigate, currentlySelectedRuleData.id, MODE);
            }
          })
          .catch(() => {
            toast.error("Error in saving rule. Please contact support.");
          });
      } else {
        toast.warn(ruleValidation.message);
        trackErrorInRuleCreation(snakeCase(ruleValidation.error), currentlySelectedRuleData.ruleType);
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveFn = (event) => {
    if ((navigator.platform.match("Mac") ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      handleBtnOnClick("cmd+s");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", saveFn);
    return () => {
      document.removeEventListener("keydown", saveFn);
    };
  }, [saveFn]);

  return (
    <>
      <PremiumFeature
        popoverPlacement="bottomLeft"
        features={[FeatureLimitType.num_rules]}
        onContinue={() => handleBtnOnClick("button_click")}
        disabled={
          isDisabled ||
          location?.state?.source === "my_rules" ||
          location?.state?.source === "rule_selection" ||
          MODE === APP_CONSTANTS.RULE_EDITOR_CONFIG.MODES.EDIT
        }
        source={currentlySelectedRuleData.ruleType}
      >
        <Tooltip title={tooltipText} placement="top">
          <Button data-tour-id="rule-editor-create-btn" type="primary" className="text-bold" disabled={isDisabled}>
            {isCurrentlySelectedRuleHasUnsavedChanges ? "*" : null}
            {`Save rule`}
          </Button>
        </Tooltip>
      </PremiumFeature>
    </>
  );
};

export default CreateRuleButton;
