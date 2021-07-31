var FormControlsBase = function()
{
}

FormControlsBase.prototype.Elfproef = function(formElement)
{
    if (formElement == null)
        return false;

    formElement = document.getElementById(formElement);
    
    return formElement.value.length == 11;
}

FormControlsBase.prototype.Comments_OnkeyUp = function()
{
    var formElement = document.getElementById('tbComments');
    var charsLeft = 500 - (formElement.value.length);
    
    formElement = document.getElementById('commentsCharsLeft');
    formElement.innerHTML = charsLeft;
}

FormControlsBase.prototype.ToggleOrganisation = function(checkbox)
{
    // Toggle the organisation group
    this.ToggleSection(checkbox, 'organisationGroup');
   
    // See if the emailGroup should be enabled
    var emailGroupEnabled = document.getElementById('cbMailingList').checked;
    
    // Disable emailGroup if organisationGroup is disabled
    if (!checkbox.checked)
        emailGroupEnabled = false;
 
    // Change the emailGroup validation group
    JSFormValidator.ChangeValidationGroup(checkbox.form, 'emailGroup', emailGroupEnabled);
}

FormControlsBase.prototype.ToggleSection = function(checkbox, groupname)
{
    var displayStyle = null;
    
    if (checkbox.checked)
    {
        JSFormValidator.ChangeValidationGroup(checkbox.form, groupname, true);
        displayStyle = 'block';
    }
    else
    {
        JSFormValidator.ChangeValidationGroup(checkbox.form, groupname, false);
        displayStyle = 'none';
    }
    
    document.getElementById(groupname).style.display = displayStyle;
    
}

var JSFormControls =  new FormControlsBase();
