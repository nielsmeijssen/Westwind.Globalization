/// <reference path="localizationservice.js" />
/// <reference path="../bower_components/lodash/lodash.js" />
(function(undefined) {
        'use strict';

        var app = angular
            .module('app')
            .controller('listController', listController);

        listController.$inject = ['$scope', '$timeout', '$upload', 'localizationService'];

        function listController($scope, $timeout, $upload, localizationService) {
            console.log('list controller');

            var vm = this;

            vm.resources = resources;
            vm.dbRes = resources.dbRes;
            vm.listVisible = true;
            vm.searchText = null;
            vm.resourceSet = null;
            vm.resourceSets = [];
            vm.resourceList = [];
            vm.resourceId = null;
            vm.activeResource = null;
            vm.localeIds = [];
            vm.resourceItems = [];
            vm.resourceItemIndex = 0;
            vm.newResourceId = null;
            vm.uploadProgress = null;
            vm.editedResource = null,
                vm.error = {
                    message: null,
                    icon: "info-circle",
                    cssClass: "info"
                }

            vm.newResource = function() {
                return {
                    "ResourceId": null,
                    "Value": null,
                    "Comment": null,
                    "Type": "",
                    "LocaleId": "",
                    "ResourceSet": "",
                    "TextFile": null,
                    "BinFile": null,
                    "FileName": ""
                };
            };


            vm.onResourceUpload = function(files) {
                if (files && files.length) {
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        $upload.upload({
                                url: 'LocalizationService.ashx?method=UploadResource',
                                fields: { 'resourceset': vm.resourceSet, 'resourceid': vm.resourceId, "localeid": vm.activeResource.LocaleId },
                                file: file
                            }).progress(function(evt) {
                                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                                vm.uploadProgress = progressPercentage + '% ' + evt.config.file.name;
                            }).success(function(data, status, headers, config) {
                                $("#AddResourceDialog").modal('hide');
                                vm.getResourceItems();
                                showMessage(vm.dbRes('ResourceSaved'));
                                vm.uploadProgress = null;
                            })
                            .error(function() {
                                parseError(arguments);
                                vm.uploadProgress = null;
                            });
                    }
            }
        };

       vm.collapseList = function () {           
           vm.listVisible = !vm.listVisible;
           console.log(vm.listVisible);
       };

        vm.getResourceSets = function getResourceSets() {
            return localizationService.getResourceSets()
                .success(function(resourceSets) {
                    vm.resourceSets = resourceSets;
                    if (!vm.resourceSet && resourceSets && resourceSets.length > 0)
                        vm.resourceSet = vm.resourceSets[0];
                    vm.onResourceSetChange();
                })
                .error(parseError);
        };


       vm.updateResource = function(resource) {
           return localizationService.updateResource(resource)
                    .success(function () {
                        vm.getResourceItems();
                        showMessage(vm.dbRes('ResourceSaved'));
           })
           .error(parseError);
       };

        vm.updateResourceString = function (value, localeId) {            
            return localizationService.updateResourceString(value, vm.resourceId, vm.resourceSet, localeId)
                .success(function() {                               
                    vm.getResourceItems();
                    showMessage(vm.dbRes('ResourceSaved'));
                })
                .error(parseError);
        };

        

        vm.getResourceList = function getResourceList() {
            return localizationService.getResourceList(vm.resourceSet)
                .success(function(resourceList) {
                    vm.resourceList = resourceList;
                    if (resourceList.length > 0) {
                        vm.resourceId = vm.resourceList[0].ResourceId;
                        setTimeout(function() { vm.onResourceIdChange(); }, 10);
                    }
                })
                .error(parseError);
        };

        vm.getResourceItems = function getResourceItems() {

            localizationService.getResourceItems(vm.resourceId, vm.resourceSet)
                .success(function (resourceItems) {                    
                    vm.resourceItems = resourceItems;
                    if (vm.resourceItems.length > 0) {
                        vm.activeResource = vm.resourceItems[0];
                        for (var i = 0; i < vm.resourceItems.length; i++) {
                            var resource = vm.resourceItems[i];
                            if (!resource.Value) {
                                resource.Value = !resource.Type
                                    ? resource.Value
                                    : 'binary: ' + resource.Type + ':' + resource.FileName;
                            }
                        }
                    }
                })
                .error(parseError);
        };

   

        /// *** Event handlers *** 

        vm.onResourceSetChange = function onResourceSetChange() {            
            vm.getResourceList();
        };
        vm.onResourceIdChange = function onResourceIdChange() {
            vm.getResourceItems();
        };
       
        vm.onLocaleIdChanged = function onLocaleIdChanged(resource) {
            if (resource !== undefined) {                
                vm.activeResource = resource;
            }
        };
        vm.onStringUpdate = function onStringUpdate(resource) {            
            vm.activeResource = resource;
            vm.editedResource = resource.Value;
            vm.updateResourceString(resource.Value, resource.LocaleId);
        };
        vm.onResourceKeyDown = function onResourceKeyDown(ev, resource, form) {
            // Ctrl-Enter - save and next field
            if (ev.ctrlKey && ev.keyCode === 13) {
                vm.onStringUpdate(resource);
                $timeout(function () {
                    // set focus to next field
                    var el = $(ev.target);
                    var id = el.prop("id").replace("value_", "") * 1;
                    var $el = $("#value_" + (id + 1));
                    if ($el.length < 1)
                        $el = $("#value_0"); // loop around
                    $el.focus();
                }, 100);
                $scope.resourceForm.$setPristine();

            }
        };
       vm.onTranslateClick = function(ev, resource) {           
           vm.editedResource = resource.Value;
           var id = $(ev.target).parent().find("textarea").prop("id");

           // notify Translate Dialog of active resource and source element id
           $scope.$emit("startTranslate", resource, id);
           $("#TranslateDialog").modal();
       };

       // call back from translate controller
       $scope.$root.$on("translateComplete", function (e, lang, value) {
           var res = null;
           var index = -1;
           for (var i = 0; i < vm.resourceItems.length; i++) {
               res = vm.resourceItems[i];
               if (res.LocaleId === lang) {
                   index = i;
                   break;
               }                                  
               res = null;
           }

           if (res == null) {
               res = vm.newResource();
               res.LocaleId = lang;
               //res.Value = value;
               res.ResourceId = vm.resourceId;
               res.ResourceSet = vm.resourceSet;
               vm.resourceItems.push(res);
           }
           //else
           //    vm.resourceItems[index].Value = value;

           if (index == -1)
               index = vm.resourceItems.length - 1;
           
           ww.angular.applyBindingValue("#value_" + index, value);

           // assign the value directly to field
           // to force to $dirty state and show green check
           $timeout(function() {
               angular.element('#value_' + index)
                   .val(value)
                   .controller('ngModel')                   
                   .$setViewValue(value);
           }, 100);

       });

       vm.onResourceIdBlur = function() {
           if (!vm.activeResource.Value)
               vm.activeResource.Value = vm.activeResource.ResourceId;

       }
       vm.onAddResourceClick = function() {
           
           var res = vm.newResource();           
           res.ResourceSet = vm.activeResource.ResourceSet;
           res.LocaleId = vm.activeResource.LocaleId;
           res.ResourceId = vm.activeResource.ResourceId;
           vm.activeResource = res;

           $("#AddResourceDialog").modal();
       };
       vm.onEditResourceClick = function () {
           $("#AddResourceDialog").modal();
       };

       vm.onSaveResourceClick = function () {
           vm.updateResource(vm.activeResource)
               .success(function () {
                   var id = vm.activeResource.ResourceId;
                   var resourceSet = vm.activeResource.ResourceSet;

                   // check to see if resourceset exists
                   var i = _.findIndex(vm.resourceSets, function (set) {
                       return set === resourceSet;
                   });
                   if (i < 0) {
                       vm.resourceSets.unshift(vm.activeResource.ResourceSet);
                       vm.resourceSet = vm.activeResource.ResourceSet;
                       vm.onResourceSetChange();
                   }

                   // check if resourceId exists
                   var i = _.findIndex(vm.resourceList,function(res) {
                       return res.ResourceId === id;
                   });                   
                   if (i < 0)
                       vm.resourceList.unshift(vm.activeResource);

                   vm.resourceId = id;
                   vm.onResourceIdChange();

                   

                   $("#AddResourceDialog").modal('hide');
               })
               .error(function() {
                   var err = ww.angular.parseHttpError(arguments);
                   alert(err.message);
               });
       };
       vm.onDeleteResourceClick = function() {
           var id = vm.activeResource.ResourceId;

           if (!confirm(
               id +
               "\n\n" +
               vm.dbRes('AreYouSureYouWantToDeleteThisResource')))
               return;

           localizationService.deleteResource(id, vm.activeResource.ResourceSet)
               .success(function() {
                   var i = _.findIndex(vm.resourceList, function(res) {
                       return res.ResourceId === id;
                   });

                   vm.resourceList.splice(i, 1);

                   if (i > 0)
                       vm.resourceId = vm.resourceList[i - 1].ResourceId;
                   else
                       vm.resourceId = vm.resourceList[0].ResourceId;
                   vm.onResourceIdChange();

                   showMessage(String.format(vm.dbRes('ResourceDeleted'), id));
               })
               .error(function() {
                   showMessage(String.Format(vm.dbRes('ResourceNotDeleted'), id));
               });
       };
       vm.onRenameResourceClick = function () {
           vm.newResourceId = null;
           $("#RenameResourceDialog").modal();
           $timeout(function() {
               $("#NewResourceId").focus();
           },1000);
       };
       vm.onRenameResourceDialogClick = function () {
           localizationService.renameResource(vm.activeResource.ResourceId, vm.newResourceId, vm.activeResource.ResourceSet)
               .success(function () {                                      
                   for (var i = 0; i < vm.resourceList.length; i++) {
                       var res = vm.resourceList[i];                       
                       if (res.ResourceId == vm.activeResource.ResourceId) {                               
                           vm.resourceList[i].ResourceId = vm.newResourceId;
                           break;
                       }
                   }
                   vm.activeResource.ResourceId = vm.newResourceId;
                   showMessage(String.format(vm.dbRes('ResourceSetWasRenamedTo,vm.newResourceId')));
                   $("#RenameResourceDialog").modal("hide");
               })
               .error(parseError);
       }

       vm.onDeleteResourceSetClick = function () {
           if (!confirm(vm.dbRes('YouAreAboutToDeleteThisResourceSet') + ":\n\n     " + 
                        vm.resourceSet + "\n\n" +
               vm.dbRes('AreYouSureYouWantToDoThis')))
               return;

           localizationService.deleteResourceSet(vm.resourceSet)
               .success(function () {
                   vm.getResourceSets();
                   showMessage(vm.resoures.ResourceSetDeleted);
                   vm.resourceSet = vm.resourceSets[0];
                   vm.onResourceSetChange();
               })
               .error(parseError);
       }

       vm.onRenameResourceSetClick = function () {
           var newResourceSet = prompt(String.format(vm.dbRes('RenameResourceSetTo'),vm.resourceSet), "");
           if (!newResourceSet)
               return;


           localizationService.renameResourceSet(vm.resourceSet, newResourceSet)
               .success(function() {
                   vm.getResourceSets()
                       .success(function() {
                           vm.resourceSets.every(function(rs) {
                               if (rs == newResourceSet) {
                                   vm.resourceSet = rs;
                                   vm.getResourceList();
                                   return false;
                               }
                               return true;
                           });
                       });
                   showMessage(vm.dbRes('ResourceSetRenamed'));
               })
               .error(parseError);
       }
       vm.onReloadResourcesClick = function() {
           localizationService.reloadResources()
               .success(function() {
                   showMessage(vm.dbRes('ResourcesHaveBeenReloaded'));
               })
               .error(parseError);           
       };
       vm.onBackupClick = function () {
           localizationService.backup()
               .success(function () {
                   showMessage(vm.dbRes('ResourcesHaveBeenBackedUp'));
               })
               .error(parseError);
       };
       vm.onCreateTableClick = function () {
           localizationService.createTable()
               .success(function () {
                   vm.getResourceSets();
                   showMessage(vm.dbRes('LocalizationTableHasBeenCreated'));
               })
               .error(parseError);
       };
       vm.showMessage = showMessage;
        vm.parseError = parseError;

       function parseError(args) {           
           var err = ww.angular.parseHttpError(args || arguments);           
           showMessage(err.message,"warning","warning");
       }
        function showMessage(msg, icon, cssClass) {
            
            if (!vm.error)
                vm.error = {};
            if (msg)
                vm.error.message = msg;

            if (icon)
                vm.error.icon = icon;
            else
                vm.error.icon = "info-circle";

            if (cssClass)
                vm.error.cssClass = cssClass;
            else
                vm.error.cssClass = "info";            

            $timeout(function() {
                if (msg === vm.error.message)
                    vm.error.message = null;
            }, 5000);            
        }

        function parseQueryString() {
            var query = window.location.search;
            var res = {
                isEmpty: !query,
                query: query,
                resourceId: getUrlEncodedKey("ResourceId", query),
                resourceSet: getUrlEncodedKey("ResourceSet", query)
            }

            return res;
        }

       function selectResourceSet(query) {           
           if(!query.resourceSet)
                return;

           for (var i = 0; i < vm.resourceSets.length; i++) {
               if (vm.resourceSets[i] == query.resourceSet) {                       
                   vm.resourceSet = vm.resourceSets[i];
                   $timeout(function() { selectResourceId(query) });
                   break;
               }                   
           }
        
           function selectResourceId(query) {
               vm.getResourceList()                         
               .success(function() {
                   for (var i = 0; i < vm.resourceList.length; i++) {
                       if (vm.resourceList[i].ResourceId === query.resourceId) {
                           vm.resourceId = vm.resourceList[i].ResourceId;
                           vm.onResourceIdChange();
                           break;
                       }
                   }
               });
           }

       }
       function selectResourceId(resourceId) {
           
           for (var i = 0; i < vm.resourceList.length; i++) {
               if (resourceSet.ResourceId == resourceSetId) {
                   vm.resourceSet == resourceSet;
                   break;
               }
           }
       }



        $(document.body).keydown(function (ev) {
           if (ev.keyCode == 76 && ev.altKey) {
               $("#ResourceIdList").focus();
           }
       });
       


        // initialize
       vm.getResourceSets()
           .success(function() {
               var query = parseQueryString();
               if (query.isEmpty)
                   return;
           console.log(query);
               selectResourceSet(query);
           });
   }
})();

