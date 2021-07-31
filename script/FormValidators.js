var JSFormValidatorBase = function () {
    this.validationGroups = new Array();
    this.validationSummaries = new Array();
}

Array.prototype.Contains = function (value) {
    // Return value
    var exists = false;

    // Loop through all the elements and check for existing value 
    for (i = 0; i < this.length; ++i) {
        if (this[i] == value) {
            exists = true;
            break;
        }
    }

    // Return
    return exists;
}

JSFormValidatorBase.prototype.FormSubmit = function (formInstance) {
    // Find all the validator elements in the form
    var validators = this.GetFormValidators(formInstance);

    // Check for validators, otherwise we can submit
    if (validators.length <= 0)
        return true;

    // Initialize validators
    this.InitializeValidators(validators, formInstance);

    // These are used to finish up this event
    var allValidatorsValid = true;
    var focusElement = null;

    // Loop through all the validators and try to execute them
    for (var i = 0; i < validators.length; ++i) {
        // Find the validator itself
        var validator = validators[i];
        var validatorValid = false;

        try {
            if (validator.validate != null) {
                // Try to validate the validator
                validatorValid = validator.validate(this);
            }
        }
        catch (ex) {
            var errorMessage = ex.message != null ? ex.message : ex;
            alert("An error occurred while executing the validator " + validator.name + ": \r\n\r\n" + errorMessage);
        }

        // If the validator didn't validate 
        if (!validatorValid && allValidatorsValid) {
            // Make sure we won't submit the form
            allValidatorsValid = false;

            // Set a new focus element if not set yet
            if (focusElement == null && validator.element != null)
                focusElement = validator.element;
        }
    }

    // Check for at least a single invalid validator
    if (!allValidatorsValid && focusElement != null) {
        // Focus the element that we need
        focusElement.focus();
    }

    // Check for validation summaries
    if (!allValidatorsValid && this.validationSummaries.length > 0) {
        // Loop through all the summaries
        for (var i = 0; i < this.validationSummaries.length; i++) {
            // A collection of validators to use
            var summaryValidators = validators;

            // Find the group
            var validationGroup = this.validationSummaries[i].group;

            // Check for validators in the group
            if (validationGroup != null && this.validationGroups[validationGroup] != null)
                summaryValidators = this.validationGroups[validationGroup];

            // Check for validators
            if (summaryValidators.length > 0) {
                // Reset summary
                this.validationSummaries[i].innerHTML = '';

                // Loop through all the validators
                for (var j = 0; j < summaryValidators.length; ++j) {
                    // Check for enabled
                    if (summaryValidators[j].disabled)
                        continue;

                    // Find the error message
                    var errorMessage = summaryValidators[j].errorMessage;

                    // Handle empty messages
                    if (errorMessage == null || errorMessage == '')
                        errorMessage = "Field validation error: " + summaryValidators[j].element.name;

                    this.validationSummaries[i].innerHTML += errorMessage + " <br />";
                }
            }
        }
    }

    // Return
    return allValidatorsValid;
}

JSFormValidatorBase.prototype.GetFormValidators = function (formInstance) {
    // Find all DIV elements
    var divElements = formInstance.getElementsByTagName("div");

    // Create an array to hold all the validation DIVs
    var validators = new Array();

    // Check for validators
    if (divElements.length > 0) {
        // Loop through all the DIVs and insert the validators into the array
        for (var i = 0; i < divElements.length; i++) {
            var validator = divElements[i];
            var validatorType = validator.getAttribute("validator");

            // Check for a validator attribute
            if (validatorType != null) {
                // Handle validation summaries
                if (validatorType == "summary") {
                    this.InitializeValidationSummary(divElements[i]);
                    continue;
                }

                // The validator attribute indicates a validator, thus we add it to the array
                validators.push(validator);
            }
        }
    }

    // Return the validators array
    return validators;
}

JSFormValidatorBase.prototype.InitializeValidators = function (validators, formInstance) {
    // Check for validators, otherwise return
    if (validators.length <= 0)
        return;

    // Iterate over all validators and initialize them
    for (var i = 0; i < validators.length; i++) {
        // Check if the validator has been initialized before
        if (!validators[i].hasInitialized)
            this.InitializeValidator(validators[i], formInstance);
    }
}

JSFormValidatorBase.prototype.InitializeValidator = function (validator, formInstance) {
    // Find the validator attributes
    var validatorName = validator.getAttribute("id");
    var validatorType = validator.getAttribute("validator");
    var validationGroup = validator.getAttribute("validationGroup");
    var errorMessage = validator.getAttribute("errorMessage");

    // Set the validator attributes on the validator
    validator.name = validatorName;
    validator.typeVal = validatorType;
    validator.group = validationGroup;
    validator.errorMessage = errorMessage;
    validator.hasInitialized = true;
    validator.disabled = false;

    // These values are used below 
    var validatorFor = validator.getAttribute("validatorFor");
    var disabled = validator.getAttribute("disabled");
    var eventName = validator.getAttribute("eventName");

    // Check for the disabled attribute
    if (disabled != null)
        validator.disabled = disabled;

    // Register the validator with its group
    if (validationGroup != null)
        this.RegisterValidationGroup(validator, validationGroup);

    // Attach the validation events, this means that the validator can validate itself properly
    this.AttachValidationEvents(validator);

    // Find the validating element
    var element = document.getElementById(validatorFor);

    // Handle null for element
    if (element == null)
        return;

    // Set the validating element on the validator
    if (validator.element == null)
        validator.element = element;

    // Find the type
    if (validator.type == null) {
        // For input fields we use the type attribute, otherwise the tag (textarea, select, etc.)
        validator.type = validator.element.tagName == "INPUT"
            ? validator.element.type.toLowerCase()
            : validator.element.tagName.toLowerCase();
    }

    // Attach the form events to the validation process (such as a onkeyup event for a textbox)
    this.AttachFormEvents(validator, element, eventName);

    // Check for compare validator, which means the compareTo element also requires a formevent
    if (validatorType == "compare") {
        // Find the compareto attribute
        var compareTo = validator.getAttribute("compareTo");

        // Find the DOM element for the compareto 
        var compareToElement = document.getElementById(compareTo);

        // Register the events for the compareToElement aswell
        this.AttachFormEvents(validator, compareToElement, eventName);
    }

    // Check for radio validators, which means multiple elements require formevents
    if (validator.type == "radio") {
        // Find the name of the radio group
        var radioGroupName = validator.element.getAttribute('name');

        // Find the buttons in form
        var radioButtons = formInstance[radioGroupName];

        // Handle null for radiobuttons element
        if (radioButtons == null)
            throw "RadioButton element `" + radioGroupName + "` not found";

        // Iterate over each button and attach the form event
        for (var i = 0; i < radioButtons.length; i++) {
            // Attach the form events
            this.AttachFormEvents(validator, radioButtons[i], eventName);
        }
    }
}

JSFormValidatorBase.prototype.RegisterValidationGroup = function (validator, groupName) {
    // Handle null for group array
    if (this.validationGroups[groupName] == null)
        this.validationGroups[groupName] = new Array();

    // Add the validator to the group if not present
    if (!this.validationGroups[groupName].Contains(validator))
        this.validationGroups[groupName].push(validator);
}

JSFormValidatorBase.prototype.ChangeValidator = function (formInstance, validatorId, enabled) {
    // Find all the validator elements in the form
    var validators = this.GetFormValidators(formInstance);

    // Check for validators
    if (validators.length <= 0)
        return true;

    // Initialize validators, this will never execute twice anyway
    this.InitializeValidators(validators, formInstance);

    // Find the validator in the form instance
    var validator = document.getElementById(validatorId);

    // Handle null for validator
    if (validator == null)
        throw "Validator `" + validatorId + "` not found";

    // Check if this element is found in the validator array
    if (validators.Contains(validator)) {
        // Disable the validator
        validator.disabled = !enabled;

        // Toggle the validator
        this.ToggleValidator(validator, !enabled);
    }
}

JSFormValidatorBase.prototype.ChangeValidationGroup = function (formInstance, groupName, enabled) {
    // Find all the validator elements in the form
    var validators = this.GetFormValidators(formInstance);

    // Check for validators
    if (validators.length <= 0)
        return true;

    // Initialize validators, this will never execute twice anyway
    this.InitializeValidators(validators, formInstance);

    // Check if the group exists
    if (this.validationGroups[groupName] != null) {
        // Loop though each validator in the group
        for (var i = 0; i < this.validationGroups[groupName].length; i++) {
            // Change the validator
            this.validationGroups[groupName][i].disabled = !enabled;

            // Validator the validator
            if (this.validationGroups[groupName][i].validate != null)
                this.validationGroups[groupName][i].validate(this);
        }

        // Find the div
        var groupDiv = document.getElementById(groupName);

        if (groupDiv != null)
            groupDiv.style.display = enabled ? 'block' : 'none';
    }
}

JSFormValidatorBase.prototype.InitializeValidationSummary = function (validator) {
    // Find the validator attributes
    var validatorName = validator.getAttribute("ID");
    var validationGroup = validator.getAttribute("validationGroup");

    // Set the validator attributes on the validator
    validator.name = validatorName;
    validator.group = validationGroup;
    validator.hasInitialized = true;
    validator.disabled = false;

    // Add the validator summary to the summaries collection
    if (!this.validationSummaries.Contains(validator))
        this.validationSummaries.push(validator);
}

JSFormValidatorBase.prototype.AttachFormEvents = function (validator, element, eventName) {
    // Create a validators array on the element if not present
    if (typeof (element.validators) == "undefined")
        element.validators = new Array();

    // Check if validator is registered on the element
    if (!element.validators.Contains(validator))
        element.validators.push(validator);

    // Create a local scope reference to the current instance
    var formValidator = this;

    // Check if the eventhandler for validators is already attached
    if (element.hasAtttachedFormEvents != null)
        return;

    // Handle null for eventname in text boxes
    if (eventName == null) {
        switch (validator.type) {
            case "text":
            case "textarea":
            case "password":
                eventName = "onkeyup";
                break;

            case "checkbox":
            case "radio":
                eventName = "onclick";
                break;

            case "select":
                eventName = "onchange";
                break;

            default:
                break;
        }

    }

    // Original event
    var originalEventHandler = null;

    // Check for existing event 
    if (element[eventName] != null)
        originalEventHandler = element[eventName];

    // Create the onkeyup event to keep on validating the field
    element[eventName] = function () {
        // This is used to finish up 
        var allValidatorsValid = true;

        // Validate each validator
        for (i = 0; i < element.validators.length; ++i) {
            // Use the outer scope reference in the event
            var validatorValid = element.validators[i].validate(formValidator);

            // If the validator didn't validate 
            if (!validatorValid && allValidatorsValid)
                allValidatorsValid = false;
        }

        // Check for original event
        if (originalEventHandler != null && typeof (originalEventHandler) == "function")
            originalEventHandler();
    }

    // Set this value to true so we do not attach this event again
    element.hasAtttachedFormEvents = true;
}

JSFormValidatorBase.prototype.AttachValidationEvents = function (validator) {
    // Check for existing validation event
    if (validator.validate != null)
        throw "Validation event already attached";

    // Find the validator type
    switch (validator.typeVal) {
        case null:
            break;

        case "custom":
            validator.validate = function (formValidator) {
                return formValidator.CustomValidator(validator);
            }
            break;

        // Use the required field validator
        case "required":
            validator.validate = function (formValidator) {
                return formValidator.RequiredFieldValidator(validator);
            }
            break;

        // Use the expression field validator
        case "regExp":
            validator.validate = function (formValidator) {
                return formValidator.RegularExpressionValidator(validator);
            }
            break;

        case "range":
            validator.validate = function (formValidator) {
                return formValidator.RangeValidator(validator);
            }
            break;

        case "compare":
            validator.validate = function (formValidator) {
                return formValidator.CompareValidator(validator);
            }
            break;

        default:
            throw "ValidatorType (" + validator.typeVal + ") unknown";
            break;
    }
}

JSFormValidatorBase.prototype.ToggleValidator = function (validator, valid) {
    // Set the display style to inline or none
    validator.className = valid ? "validator valid" : "validator invalid";
}

JSFormValidatorBase.prototype.CustomValidator = function (validator) {
    // Return true if the validator is disabled
    if (validator.disabled) {
        // Update the validator
        this.ToggleValidator(validator, true);
        return true;
    }

    // Find the validation script
    var validationScript = validator.getAttribute("validationScript");

    // Handle null
    if (validationScript == null)
        throw "ValidationScript attribute expected";

    // State boolean
    var valid = false;

    try {
        // Execute the custom validation script 
        valid = eval(validationScript);
    }
    catch (ex) {
        throw "CustomValidator exception: " + ex.message;
    }


    // Toggle the validator
    this.ToggleValidator(validator, valid);

    // Return
    return valid;
}

JSFormValidatorBase.prototype.RequiredFieldValidator = function (validator) {
    // Return true if the validator is disabled
    if (validator.disabled) {
        // Update the validator
        this.ToggleValidator(validator, true);
        return true;
    }

    // State boolean
    var valid = false;

    // Check the type
    switch (validator.type) {
        case "text":
        case "textarea":
        case "password":
        case "select":
            // If the text is empty, the validation fails
            if (validator.element.value.length > 0)
                valid = true;

            break;

        case "radio":
            // Find the name of the radio group
            var radioGroupName = validator.element.getAttribute('name');

            // Find the radiobuttons
            var radioButtons = document.getElementsByName(radioGroupName);

            // Handle null for radio buttons
            if (radioButtons == null)
                throw "RadioButton element `" + radioGroupName + "` not found";

            // Iterate through all the radio buttons 
            for (var i = 0; i < radioButtons.length; i++) {
                // If a single one is checked, we may proceed
                if (radioButtons[i].checked) {
                    valid = true;
                    break;
                }
            }

            break;

        case "checkbox":
            // Simple checked will do
            if (validator.element.checked)
                valid = true;

            break;

        default:
            break;
    }

    // Toggle the validator
    this.ToggleValidator(validator, valid);

    return valid;
}

JSFormValidatorBase.prototype.RegularExpressionValidator = function (validator) {
    // Return true if the validator is disabled
    if (validator.disabled) {
        // Update the validator
        this.ToggleValidator(validator, true);

        // Pass validation
        return true;
    }

    // Find the validation expression
    var validatorExpression = validator.getAttribute("validationExpression");

    // Handle null
    if (validatorExpression == null)
        throw "ValidatorExpression attribute expected";

    // State boolean
    var valid = false;

    // Find the expression
    var regExp = new RegExp(validatorExpression);

    try {
        // Check the type
        switch (validator.type) {
            case "text":
            case "textarea":
            case "password":
            case "select":
                // If the regexp fails, validation fails
                if (regExp.test(validator.element.value))
                    valid = true;
                break;

            default:
                break;
        }
    }
    catch (ex) {
        throw "Regular expression exception: \r\n\r\n" + ex.message;
    }

    // Toggle the validator
    this.ToggleValidator(validator, valid);

    return valid;
}

JSFormValidatorBase.prototype.RangeValidator = function (validator) {
    // Return true if the validator is disabled
    if (validator.disabled) {
        // Toggle the validator
        this.ToggleValidator(validator, true);

        // Pass validation
        return true;
    }

    // Find the validation expression
    var rangeFrom = validator.getAttribute("rangeFrom");
    var rangeTo = validator.getAttribute("rangeTo");

    // Handle null
    if (rangeFrom == null || rangeTo == null)
        throw "RangeFrom and rangeTo attributes expected";

    // State boolean
    var valid = false;

    try {
        // Check the type
        switch (validator.type) {
            case "text":
            case "textarea":
            case "password":
            case "select":
                // Parse the value as a number
                var elementvalue = parseInt(validator.element.value);
                rangeFrom = parseInt(rangeFrom);
                rangeTo = parseInt(rangeTo);

                // Check if the value falls within the specified range
                if (elementvalue != null && elementvalue > rangeFrom - 1 && elementvalue < rangeTo + 1)
                    valid = true;

                break;

            default:
                break;
        }
    }
    catch (ex) {
        throw "Range validation exception: \r\n\r\n" + ex.message;
    }

    // Toggle the validator
    this.ToggleValidator(validator, valid);

    return valid;
}

JSFormValidatorBase.prototype.CompareValidator = function (validator) {
    // Return true if the validator is disabled
    if (validator.disabled) {
        // Toggle the validator
        this.ToggleValidator(validator, true);

        // Pass validation
        return true;
    }

    // Find the additional validator attributes
    var compareTo = validator.getAttribute("compareTo");

    // Handle null attribute
    if (compareTo == null)
        throw "CompareTo attribute expected";

    // Find the DOM element to compare against
    var compareElement = document.getElementById(compareTo);

    // Handle null for compareTo element
    if (compareElement == null)
        throw "CompareTo element not found";

    // State boolean
    var valid = false;

    try {
        // Check the type
        switch (validator.type) {
            case "text":
            case "textarea":
            case "password":
            case "select":
                // Parse the value as a number
                if (validator.element.value == compareElement.value)
                    valid = true;

                break;

            case "checkbox":
                if (validator.element.checked == compareElement.checked)
                    valid = true;

            default:
                break;
        }
    }
    catch (ex) {
        throw "Compare validation exception: \r\n\r\n" + ex.message;
    }

    // Toggle the validator
    this.ToggleValidator(validator, valid);

    // Return
    return valid;
}

var JSFormValidator = new JSFormValidatorBase();