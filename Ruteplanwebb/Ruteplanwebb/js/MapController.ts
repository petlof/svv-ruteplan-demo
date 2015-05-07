﻿///<reference path="../ts/typings/angularjs/angular.d.ts"/>
///<reference path="../ts/typings/openlayers/openlayers.d.ts"/>
///<reference path="../ts/typings/Proj4js/proj4js.d.ts"/>
///<reference path="helpers/OpenLayers.Awsome.Icon.d.ts"/>
///<reference path="app.ts"/>
///<reference path="domain.ts"/>
///<reference path="scopes.ts"/>

/* The MapController, holds functionality for the map implementation (autocomplete, searching, routing,...)*/
class MapController {

    constructor(private $scope: IMapControllerScope, routingService: SVV.RoutePlanning.IRoutingService,  geoCodeService: SVV.RoutePlanning.IGeoCodeService, $location : ng.ILocationService, wmsSettings: any) {
        proj4.defs("EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs");
        proj4.defs("EPSG:32633", "+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
        proj4.defs("EPSG:32632", "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");

        var routeStyle = {
            graphicZIndex: 2,
            strokeOpacity: 1,
            strokeColor: "#008CFF",
            strokeWidth: 5
        };

        var alternativeRouteStyle = {
            graphicZIndex: 1,
            strokeOpacity: 1,
            strokeColor: "#858585",
            strokeWidth: 5
        };

        $scope.getLocations = (val) => {
            return geoCodeService.getLocations(val);
        };

        $scope.doRouteCalculation = () => {
            $scope.routeLayer.removeAllFeatures();
            $scope.directions = null;

            var locations = [];
            var idx = 0;
            locations[idx++] = $scope.fromAddress.location;

            if ($scope.intermediateAddresses != null) {
                angular.forEach($scope.intermediateAddresses, (med) => {
                    locations[idx++] = med.location;
                });
            }
            locations[idx] = $scope.toAddress.location;

            routingService.calculateRoute(locations,
            (bounds, features: SVV.RoutePlanning.RouteResponseRouteFeature[], directions: SVV.RoutePlanning.ViewDirection[]) => {
                $scope.directions = directions;

                // zoom map if current bounds does not contain route
                //if (!$scope.map.getExtent().containsBounds(bounds)) {
                $scope.map.zoomToExtent(bounds);
                //}

                // add features to map
                $scope.routeLayer.addFeatures(features);
                if (directions != null && directions.length > 0) {
                    $scope.selectRoute(directions[0].routeId);
                }

            }, $scope.blockedPoints, $scope.blockedAreas, $scope.weight, $scope.height);
        };

        $scope.reverseRoute = () => {
            var from = $scope.fromAddress;
            $scope.fromAddress = $scope.toAddress;
            $scope.toAddress = from;

            if ($scope.intermediateAddresses != undefined) {
                $scope.intermediateAddresses.reverse();
            }


            $scope.updateMarkers();
        };

        $scope.removeBlocks = () => {
            $scope.blockedPoints = [];
            $scope.blockedAreas = [];

            $scope.updateMarkers();
        };

        $scope.hasBlocks = () => {
            var points = $scope.blockedPoints != undefined && $scope.blockedPoints.length > 0;
            var areas = $scope.blockedAreas != undefined && $scope.blockedAreas.length > 0;
            return points || areas;
        };

        $scope.updateMarkers = () => {
            $scope.markerLayer.destroyFeatures();
            $scope.barrierLayer.destroyFeatures();

            if ($scope.fromAddress != null) {
                var featureFrom = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point($scope.fromAddress.location.lon, $scope.fromAddress.location.lat),null,
                 {externalGraphic: '/images/frommarker.png', graphicHeight: 46, graphicWidth: 35,      graphicXOffset:-17, graphicYOffset:-46  });
                (<any>featureFrom).draggable = true;
                (<any>featureFrom).onfeaturedragged = () => {  $scope.fromAddress = new SVV.RoutePlanning.AddressItem("Punkt i kartet", 
                    new OpenLayers.LonLat((<OpenLayers.Geometry.Point>featureFrom.geometry).x,(<OpenLayers.Geometry.Point>featureFrom.geometry).y));
                    $scope.updateMarkers();
                };
                $scope.markerLayer.addFeatures([featureFrom]);
                $location.search('from', JSON.stringify($scope.fromAddress));
            }
            if ($scope.toAddress != null) {
                var featureTo = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point($scope.toAddress.location.lon, $scope.toAddress.location.lat), null,
                { externalGraphic: '/images/tomarker.png', graphicHeight: 46, graphicWidth: 35, graphicXOffset: -17, graphicYOffset: -46 });
                (<any>featureTo).draggable = true;
                 (<any>featureTo).onfeaturedragged = () => {  $scope.toAddress = new SVV.RoutePlanning.AddressItem("Punkt i kartet", 
                    new OpenLayers.LonLat((<OpenLayers.Geometry.Point>featureTo.geometry).x,(<OpenLayers.Geometry.Point>featureTo.geometry).y));
                    $scope.updateMarkers();
                };
                $scope.markerLayer.addFeatures([featureTo]);

                $location.search('to', JSON.stringify($scope.toAddress));
            }

            if ($scope.intermediateAddresses != undefined) {
                angular.forEach($scope.intermediateAddresses, (addr,index) => {
                    var featurevia = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(addr.location.lon, addr.location.lat), null,
                    { externalGraphic: '/images/viamarker.png', graphicHeight: 46, graphicWidth: 35, graphicXOffset: -17, graphicYOffset: -46 });
                    (<any>featurevia).draggable = true;
                     (<any>featurevia).onfeaturedragged = () => {  $scope.intermediateAddresses[index] = new SVV.RoutePlanning.AddressItem("Punkt i kartet", 
                    new OpenLayers.LonLat((<OpenLayers.Geometry.Point>featurevia.geometry).x,(<OpenLayers.Geometry.Point>featurevia.geometry).y));
                    $scope.updateMarkers();
                };
                    $scope.markerLayer.addFeatures([featurevia]);
                });
                $location.search('intermediate', JSON.stringify($scope.intermediateAddresses));
            }

            if ($scope.blockedPoints != undefined) {
                angular.forEach($scope.blockedPoints, (point) => {
                    var featureBlockedPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(point.lon, point.lat), null,
                        { externalGraphic: '/images/block-icon.png', graphicHeight: 25, graphicWidth: 25, graphicXOffset: -12, graphicYOffset: -12 });
                    $scope.barrierLayer.addFeatures([featureBlockedPoint]);
                });
                $location.search('blockedPoints', JSON.stringify($scope.blockedPoints));
            }

            if ($scope.blockedAreas != undefined) {
                angular.forEach($scope.blockedAreas, (area : SVV.RoutePlanning.Polygon) => {
                    var pts = area.points.map(x => new OpenLayers.Geometry.Point(x.lon, x.lat));
                    var featureBlockedArea = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon(new OpenLayers.Geometry.LinearRing(pts)),null, { fillColor: "red",fillOpacity: 0.7, strokeColor: "black" });
                    $scope.barrierLayer.addFeatures([featureBlockedArea]);
                });
                $location.search('blockedAreas', JSON.stringify($scope.blockedAreas));
            }

            if ($scope.height != undefined) {
                if (typeof $scope.height == "string")
                    $scope.height = +(<any>$scope.height).replace(",", ".");
                if ($scope.height > 4.5)
                    $scope.height = 4.5;
                $location.search('height', JSON.stringify($scope.height));
            }
            if ($scope.weight != undefined) {
                if (typeof $scope.weight == "string")
                    $scope.weight = +(<any>$scope.weight).replace(",", ".");
                if ($scope.weight > 50)
                    $scope.weight = 50;
                $location.search('weight', JSON.stringify($scope.weight));
            }

            //If both from and to are set, do route calculation automatically
            if ($scope.fromAddress != null && $scope.toAddress != null) {
                $scope.doRouteCalculation();
            }

        };

        $scope.contextMenuAddIntermediate = (loc:any) => {
            if ($scope.intermediateAddresses === undefined) {
                $scope.intermediateAddresses = [];
            }

            var latlon = $scope.map.getLonLatFromPixel(loc);
            var idx = $scope.intermediateAddresses.length;
            $scope.intermediateAddresses[idx] = new SVV.RoutePlanning.AddressItem("Via: Punkt i kartet", latlon);
            $scope.updateMarkers();
        };

        $scope.removeIntermediate = (item:SVV.RoutePlanning.AddressItem) => {
            var idx = $scope.intermediateAddresses.indexOf(item);

            $scope.intermediateAddresses.splice(idx, 1);

            $scope.updateMarkers();
        };

        $scope.contextMenuSetFrom = (loc:any) => {
            var latlon = $scope.map.getLonLatFromPixel(loc);
            $scope.fromAddress = new SVV.RoutePlanning.AddressItem("Punkt i kartet", latlon);
            $scope.updateMarkers();
        };

        $scope.contextMenuSetTo = (loc: any) => {
            var latlon = $scope.map.getLonLatFromPixel(loc);
            $scope.toAddress = new SVV.RoutePlanning.AddressItem("Punkt i kartet", latlon);
            $scope.updateMarkers();
        };

        $scope.contextMenuBlockPoint = (loc: any) => {
            if ($scope.blockedPoints === undefined) {
                $scope.blockedPoints = [];
            }

            var latlon = $scope.map.getLonLatFromPixel(loc);
            var pt = new OpenLayers.Geometry.Point(latlon.lon, latlon.lat);
            //Check if there is a route-feature in the map "close" and snap to that one..
            angular.forEach($scope.routeLayer.features, (feature: OpenLayers.Feature.Vector) => {
                var details = <any>feature.geometry.distanceTo(pt, { details: true });
                var px1 = $scope.map.getPixelFromLonLat(new OpenLayers.LonLat(details.x0, details.y0));
                var px2 = $scope.map.getPixelFromLonLat(new OpenLayers.LonLat(details.x1, details.y1));
                var pxDist = Math.sqrt(Math.pow(px1.x - px2.x, 2) + Math.pow(px1.y - px2.y, 2));
                if (pxDist < 20) {
                    pt.x = details.x0;
                    pt.y = details.y0;
                }
            });

            latlon.lon = pt.x;
            latlon.lat = pt.y;

            $scope.blockedPoints.push(latlon);

            $scope.updateMarkers();
        };

        $scope.toggleMapControl = (key : string) => {
            angular.forEach($scope.controls, (wrapper) => {
                if (wrapper.name == key) {
                    wrapper.control.activate();
                } else {
                    wrapper.control.deactivate();
                }
            });
        };

        $scope.selectedRouteId = null;

        $scope.selectRoute = routeId => {
            $scope.selectedRouteId = routeId;

            // Draw routes
            angular.forEach($scope.routeLayer.features, feature => {
                if (feature.routeId === routeId) {
                    feature.style = routeStyle;
                } else {
                    feature.style = alternativeRouteStyle;
                }
                $scope.routeLayer.drawFeature(feature);
            });

            // Create road features for selected route
            $scope.routeFeatureLayer.destroyFeatures();

            var features = $scope.directions[routeId].features;
            angular.forEach(features, (feature:SVV.RoutePlanning.ViewDirectionFeature) => {
                if (feature.attributes != undefined) {

                    if (feature.attributes.roadFeatures != undefined && feature.attributes.roadFeatures.length > 0) {
                        angular.forEach(feature.attributes.roadFeatures, (feat : SVV.RoutePlanning.RoadFeature) => {
                            var type = feat.attributeType;
                            var subType = type.substr(type.indexOf(':')+1);
                            var imageName = null;
                            var geometry = null;
                            var hasLocation = feat.location != undefined && feat.location.length > 0;
                            var values = feat.values;
                            var html = "<span class='mo_featureType'>" + type + "</span><br/>";
                            var isRelevant = (type.match("^nvdb") && ["Bomstasjon", "Rasteplass"].indexOf(subType)+1) || type.match("^vegloggen");

                            if (type.match("^nvdb") || type.match("^vegloggen")) {

                                var name = $scope.getValue(values, "Navn");
                                if (name == null) {
                                    name = "Ukjent navn";
                                }
                                html += "<h3>"+name+"</h3>";
                                if (type.match("^nvdb")) {
                                    imageName = subType;
                                    if (subType === "Rasteplass" || subType === "Bomstasjon") {


                                    }
                                } else if (type.match("^vegloggen")) {
                                    imageName = "trafikkmelding";
                                    html = "<b>Trafikkmelding</b>";
                                }

                                angular.forEach(values, (val: SVV.RoutePlanning.Value) => {
                                    html += "<b>" + val.key + "</b>: " + val.value + "<br/>";
                                });

                                if (hasLocation) {
                                    var loc = feat.location[0];
                                    geometry = new OpenLayers.Geometry.Point(loc.easting, loc.northing);
                                } else {
                                    //console.log(feat);
                                }
                            }

                            if (isRelevant && hasLocation) {
                                var graphic = "/images/"+imageName+".png";

                                var f = new OpenLayers.Feature.Vector(geometry, null,
                                    { externalGraphic: graphic, graphicHeight: 25, graphicWidth: 25, graphicXOffset: -12, graphicYOffset: -12 });
                                f["html"] = html;


                                $scope.routeFeatureLayer.addFeatures([f]);
                            }
                        });
                    }
                }
            });
        };

        $scope.getValue = (values : SVV.RoutePlanning.Value[], key : string) : string => {
            var ret = null;
            angular.forEach(values, (val : SVV.RoutePlanning.Value) => {
                if (val.key === key) {
                    ret = val.value;
                }
            });

            return ret;
        };

        $scope.showRoute = id => id === $scope.selectedRouteId;

        $scope.zoomToDirection = (routeId: number) => {
            $scope.map.zoomToExtent($scope.directions[routeId].Bounds);
        };

        if ($location.search().from != null) {
            $scope.fromAddress = JSON.parse($location.search().from);
        }
        if ($location.search().to != null) {
            $scope.toAddress = JSON.parse($location.search().to);
        }

        if ($location.search().intermediate != null) {
            $scope.intermediateAddresses = JSON.parse($location.search().intermediate);
        }

        if ($location.search().blockedPoints != null) {
            $scope.blockedPoints = JSON.parse($location.search().blockedPoints);
        }

        if ($location.search().blockedAreas != null) {
            $scope.blockedAreas = JSON.parse($location.search().blockedAreas);
        }

        if ($location.search().weight != null) {
            $scope.weight = JSON.parse($location.search().weight);
        }

        if ($location.search().height != null) {
            $scope.height = JSON.parse($location.search().height);
        }

        $scope.$watch('markerLayer', () => {
            $scope.updateMarkers();
        });

        $scope.downloadRouteAsKML = (routeId : number,$event) => {
            var elem = $event.target;
            var format = new OpenLayers.Format.KML();
            format.foldersName = "SVV Ruteplan Export";
            var feat = $scope.routeLayer.features[routeId];
            feat = new OpenLayers.Feature.Vector(feat.geometry.clone().transform(new OpenLayers.Projection('EPSG:25833'), new OpenLayers.Projection('EPSG:4326')));
            var kml = format.write([feat]);
            var data = 'data:application/csv;charset=utf-8,' + encodeURIComponent(kml);
            elem.setAttribute("target", "_blank");
            elem.setAttribute("href", data);
        };

        $scope.$on("wmsSettingsUpdated", function() {
            console.log("wms settings updated");
            // find all user added layers
            var map = $scope.map;
            var userAddedLayers = map.getLayersBy("userAddedLayer", true);

            // remove layers that have been deleted
            angular.forEach(userAddedLayers, function(layer) {
                if (wmsSettings.layers.indexOf(layer) === -1) {
                    map.removeLayer(layer);
                }
            });
            // add new layers
            angular.forEach(wmsSettings.layers, function(layer) {
                if (userAddedLayers.indexOf(layer) === -1) {
                    map.addLayer(layer);
                }
            });

            // reorder route layers on top of wms layers
            var numlayers = map.getNumLayers();
            map.setLayerIndex($scope.routeLayer, numlayers);
            map.setLayerIndex($scope.routeFeatureLayer, numlayers);
            map.setLayerIndex($scope.markerLayer, numlayers);
            map.setLayerIndex($scope.barrierLayer, numlayers);

            $scope.map.addLayers(wmsSettings.layers);
        });

    }

}
