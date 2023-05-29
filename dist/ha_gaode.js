import "https://webapi.amap.com/loader.js"

class Ha_gaode extends HTMLElement {
  mapLoading = false
  zoneEdit = false
  editMarker = null
  editMarkerCircle = null
  amap = null
  zoneObj = {}
  gpsObj = {}
  zoneMarkerObj = {}
  zoneMarkerCircleObj = {}
  gpsCache = {}
  gpsList = []
  set hass(hass) {
    console.log(hass)
    console.log(this.content)
    // // Initialize the content if it's not there yet.
    this._handleHass(hass)
    if (!this.content) {
      this.innerHTML = `
          <div id="dxMapDiv" class="dxAmap" style="height: 100%">
            <div style="display: flex;height: 100%">
              <div style="height: 100%;width: 100%;margin: 0" id="mapContainer" class="mapContainer"></div>
              <div id="maxDiv" style="flex: 1;position: absolute;top: 200px; left: 100px;background-color: white;z-index: 5;padding: 8px">
                <div style="display: flex;margin-bottom: 8px">
                  <button id="containerMin">最小化</button>
                </div>

                <div id="zoneDiv">
                  <div style="flex: 1">Zone 位置列表</div>
                  <table border="1" id="zoneContainer">
                    
                  </table>

                  <div style="display: none" id="zoneSet">
                    <div>位置设置</div>
                    <div>
                      <span>id：</span>
                      <input id="entity_id_post_input" type="text" name="entity_id_post" />
                    </div>
                    <div>
                      <span>展示名称：</span>
                      <input id="friendly_name_input" type="text" name="friendly_name" />
                    </div>
                    <div>
                      <span>经纬度：</span>
                      <input id="ll_input" type="text" name="ll" />
                    </div>
                    <div>
                      <span>范围：</span>
                      <input id="radius_input" type="text" name="radius" />
                    </div>
                    <div>
                      <button id="zoneSetCancel">取消</button>
                      <button id="zoneSetCommit">提交</button>
                    </div>
                  </div>
                </div>

                <div id="gpsDiv">
                  <div style="flex: 1">GPS 位置列表</div>
                  <div id="gpsList">

                  </div>
                </div>


              </div>
              <div id="minDiv" style="flex: 1;position: absolute;top: 200px; left: 100px;background-color: white;z-index: 5;padding: 8px;display: none">
                  <button id="containerMax">还原</button>
              </div>
            </div>
          </div>
      `;
      this.content = this.querySelector("#dxMapDiv")
      this._loadMap(hass)
    }
    this._drawWindow(hass)
  }
  _drawWindow(hass) {
    let that = this;
    let zoneContainer = this.querySelector("#zoneContainer")
    zoneContainer.innerHTML = ''
    var rootTr = document.createElement(`tr`)
    rootTr.innerHTML = `
      <td>名称</td>
      <td>经纬度</td>
      <td>范围</td>
      <td>操作</td>
    `
    zoneContainer.appendChild(rootTr)
    for(let zoneKey in this.zoneObj) {
      const zone = this.zoneObj[zoneKey]
      const { gcj02Longitude, gcj02Latitude, friendly_name, radius } = zone.attributes

      var trE = document.createElement(`tr`)
      var key = zoneKey.replaceAll('\.', '')
      trE.innerHTML = `
          <td >${friendly_name}</td>
          <td style='cursor: pointer' id=${key + '_ll'}>${gcj02Longitude + "," + gcj02Latitude}</td>
          <td >${radius}</td>
          <td>
            <button id=${key + '_edit'} dx_entity_id=${zoneKey}>编辑</button>
          </td>
      `
      zoneContainer.appendChild(trE)
      let zoneKeyLl = this.querySelector(`#${key}_ll`)
      zoneKeyLl.addEventListener('click', () => {
        this.amap.setCenter([gcj02Longitude, gcj02Latitude])
      });
      let zoneKeyEdit = this.querySelector(`#${key}_edit`)
      zoneKeyEdit.addEventListener('click', () => {
        // if (this.zoneEdit) { this._hideZoneForm }

        var entityId = zoneKeyEdit.getAttribute('dx_entity_id')
        const zone = this.zoneObj[entityId]
        const { friendly_name, gcj02Longitude, gcj02Latitude, radius } = zone.attributes

        this._showZoneForm({
          position: [gcj02Longitude, gcj02Latitude],
          friendly_name: friendly_name,
          entity_id: entityId
        })

        var zomeForm = this._getZoneForm()
        zomeForm.entity_id_post_input.value = zone.entity_id
        zomeForm.friendly_name_input.value = friendly_name
        zomeForm.ll_input.value = gcj02Longitude + "," + gcj02Latitude
        zomeForm.radius_input.value = radius
      });
    }
    // 位置
    // let addZoneButton = this.querySelector("#addZoneButton")
    // addZoneButton.addEventListener('click', () => {
    //   let zoneSet = this.querySelector("#zoneSet")
    //   zoneSet.style = "display: block"
    // });
    let zoneSetCancel = this.querySelector("#zoneSetCancel")
    zoneSetCancel.addEventListener('click', () => {
      this._hideZoneForm()

    });
    let zoneSetCommit = this.querySelector("#zoneSetCommit")
    zoneSetCommit.addEventListener('click', () => {
      let zoneSet = this.querySelector("#zoneSet")
      var valueObj = this._getZoneFormValues()
      const zone = this.zoneObj[valueObj.entity_id]
      hass.callApi('post', 'states/' + valueObj.entity_id, {
        state: 0,
        attributes: {
          ...zone.attributes,
          ...valueObj
        }
      })
      this._hideZoneForm()
    });
    let radiusInput = this.querySelector("#radius_input")
    radiusInput.addEventListener('change', (e) => {
      this.editMarkerCircle.setRadius(radiusInput.value)
    })
    let containerMin = this.querySelector("#containerMin")
    let containerMax = this.querySelector("#containerMax")
    let minDiv = this.querySelector("#minDiv")
    let maxDiv = this.querySelector("#maxDiv")
    containerMin.addEventListener('click', (e) => {
      minDiv.style.display = 'block'
      maxDiv.style.display = 'none'
    })
    containerMax.addEventListener('click', (e) => {
      maxDiv.style.display = 'block'
      minDiv.style.display = 'none'
    })
    // GPS
    let gpsList = this.querySelector("#gpsList")
    gpsList.innerHTML = ''
    for(let gpsKey in this.gpsObj) {
      const gps = this.gpsObj[gpsKey]
      const { gcj02Longitude, gcj02Latitude, friendly_name, radius } = gps.attributes

      var devE = document.createElement(`span`)
      var key = gpsKey.replaceAll('\.', '')
      devE.innerHTML = `
        <button id=${key + '_view'} dx_entity_id=${gpsKey}>${friendly_name}</button>
      `
      gpsList.appendChild(devE)

      let gpsView = this.querySelector(`#${key}_view`)
      gpsView.addEventListener('click', () => {
        this.amap.setCenter([gcj02Longitude, gcj02Latitude])
      })
    }
  }
  _showZoneForm(obj) {
    this.amap.setCenter(obj.position)
    let zoneSet = this.querySelector("#zoneSet")
    zoneSet.style = "display: block"
    this.zoneEdit = true
    this.alayer.hide()
    this.editMarker = new AMap.LabelMarker({
        name: obj.friendly_name,
        position: obj.position,
        zooms: [3, 20],
        opacity: 1,
        icon: {
            type: 'image',
            image: 'https://a.amap.com/jsapi_demos/static/images/poi-marker.png',
            clipOrigin: [194, 92],
            clipSize: [50, 68],
            size: [25, 34],
            anchor: 'bottom-center',
            angel: 0,
            retina: true
        },
        text: {
            content: obj.friendly_name,
            direction: 'top',
            offset: [0, -5],
            style: {
              fontSize: 13,
              fontWeight: 'normal',
              fillColor: '#fff',
              padding: '2, 5',
              backgroundColor: '#22884f'
            }
        }
    })
    this.editZoneLayer.add(this.editMarker)
    this.editZoneLayer.show()
    for (let k in this.zoneMarkerCircleObj) {
      this.zoneMarkerCircleObj[k].hide()
    }
    let thisCircle = this.zoneMarkerCircleObj[obj.entity_id]
    this.editMarkerCircle = thisCircle
    thisCircle.show()
  }
  _hideZoneForm() {
    let zoneSet = this.querySelector("#zoneSet")
    zoneSet.style = "display: none"
    this.zoneEdit = false
    this._clearZoneFormValues()
    this.editZoneLayer.clear()
    this.editMarker.hide()
    this.editMarker = null
    this.editZoneLayer.hide()
    this.alayer.show()
    this.editMarkerCircle = null
    for (let k in this.zoneMarkerCircleObj) {
      this.zoneMarkerCircleObj[k].show()
    }
  }
  _getZoneForm() {
    return {
      friendly_name_input: this.querySelector("#friendly_name_input"),
      ll_input: this.querySelector("#ll_input"),
      radius_input: this.querySelector("#radius_input"),
      entity_id_post_input: this.querySelector("#entity_id_post_input"),
    }
  }
  _getZoneFormValues() {
    var zomeForm = this._getZoneForm()
    var ll = zomeForm.ll_input.value
    var llArray = ll.split(",")
    return {
      entity_id: zomeForm.entity_id_post_input.value,
      friendly_name: zomeForm.friendly_name_input.value,
      gcj02Longitude: llArray[0],
      gcj02Latitude: llArray[1],
      radius: zomeForm.radius_input.value,
      icon: "mdi:home",
    }
  }
  _clearZoneFormValues() {
    var zomeForm = this._getZoneForm()
    zomeForm.entity_id_post_input.value = null
    zomeForm.friendly_name_input.value = null
    zomeForm.ll_input.value = null
    zomeForm.radius_input.value = null
  }
  _handleHass(hass) {
    let that = this
    let { states } = hass;
    let gpsList = []
    for(let stateKey in states) {
      if (stateKey.startsWith('zone')) {
        let entity = states[stateKey]
        let { longitude, latitude, gcj02Longitude, gcj02Latitude } = entity.attributes
        if (longitude && latitude) {
          if (gcj02Longitude && gcj02Latitude) {
            // do nothing
          } else {
            var g = this.gpsCache[longitude + "," + latitude]
            if (g) {
              entity.gcj02Longitude = g.longitude
              entity.gcj02Latitude = g.latitude
            } else {
              gpsList.push([longitude, latitude])
            }
          }
        }
        this.zoneObj[stateKey] = entity
      } else if (stateKey.startsWith('device_tracker')) {
        let entity = states[stateKey]
        if (entity.attributes.source_type = 'gps') {
          let { longitude, latitude, gcj02Longitude, gcj02Latitude } = entity.attributes
          if (longitude && latitude) {
            if (gcj02Longitude && gcj02Latitude) {
              // do nothing
            } else{
              var g = this.gpsCache[longitude + "," + latitude]
              if (g) {
                entity.gcj02Longitude = g.longitude
                entity.gcj02Latitude = g.latitude
              } else {
                gpsList.push([longitude, latitude])
              }
            }
            this.gpsObj[stateKey] = entity
          }
        }
      }
    }
    this.gpsList = gpsList
    var a = function() {
      that._drawWindow(hass)
    }
    this._calcGps(a)
  }
  _calcGps(f, config) {
    if (this.gpsList.length > 0 && this.amap) {
      let localGpsList = []
      for (var i = 0; i < this.gpsList.length; i++) {
        localGpsList.push(this.gpsList[i])
      }
      let that = this
      console.log("_calcGps-gpsList->", that.gpsList)

      AMap.convertFrom(that.gpsList, 'gps', function (status, result) {
        console.log("AMap convertFrom", result)
        if (result.info === 'ok') {
          let locations = result.locations
          for (let i = 0; i < locations.length; i++) {
            let gpsLocationList = localGpsList[i]
            let location = locations[i]
            let { lng, lat } = location;
            that.gpsCache[gpsLocationList[0] + "," + gpsLocationList[1]] = {
              longitude: lng,
              latitude: lat,
            }
          }
          for(let zoneKey in that.zoneObj) {
            let zone = that.zoneObj[zoneKey]
            let { longitude, latitude } = zone.attributes
            let cache = that.gpsCache[longitude + "," + latitude]
            if (cache) {
              zone.attributes.gcj02Longitude = cache.longitude
              zone.attributes.gcj02Latitude = cache.latitude
            }
            that.zoneObj[zoneKey] = zone
          }
          for(let gpsKey in that.gpsObj) {
            let gps = that.gpsObj[gpsKey]
            let { longitude, latitude } = gps.attributes
            let cache = that.gpsCache[longitude + "," + latitude]
            if (cache) {
              gps.attributes.gcj02Longitude = cache.longitude
              gps.attributes.gcj02Latitude = cache.latitude
            }
            that.gpsObj[gpsKey] = gps
          }
          if (f) {
            f(config)
          }
        }
      });
    } else if (this.amap) {
      if (f) {
        f(config)
      }
    }
  }
  _drawMap() {
    let that = this;
    // const { hass, that } = config
     // 设置markder
    console.log(that.zoneObj)
    console.log(that.zoneMarkerObj)

    for(let zoneKey in that.zoneObj) {
        let zoneMarker = that.zoneMarkerObj[zoneKey]
        let zone = that.zoneObj[zoneKey]
        let { gcj02Longitude, gcj02Latitude, friendly_name, radius } = zone.attributes
        if (!zoneMarker) {
            var a = new AMap.LabelMarker({
              name: friendly_name,
              position: [gcj02Longitude, gcj02Latitude],
              zooms: [3, 20],
              opacity: 1,
              icon: {
                  type: 'image',
                  image: 'https://a.amap.com/jsapi_demos/static/images/poi-marker.png',
                  clipOrigin: [194, 92],
                  clipSize: [50, 68],
                  size: [25, 34],
                  anchor: 'bottom-center',
                  angel: 0,
                  retina: true
              },
              text: {
                  content: friendly_name,
                  direction: 'top',
                  offset: [0, -5],
                  style: {
                    fontSize: 13,
                    fontWeight: 'normal',
                    fillColor: '#fff',
                    padding: '2, 5',
                    backgroundColor: '#22884f'
                  }
              }
            })
            that.zoneMarkerObj[zoneKey] = a
            that.alayer.add(a);
        } else {
            zoneMarker.setPosition([gcj02Longitude, gcj02Latitude])
        }

        let zoneMarkerCircle = that.zoneMarkerCircleObj[zoneKey]
        if (!zoneMarkerCircle) {
            var b = new AMap.Circle({
              map: that.amap,
              center: [gcj02Longitude, gcj02Latitude],
              radius,
              fillOpacity: 0.3,
              strokeColor: '#14b4fc',
              strokeOpacity: 0.3,
              fillColor: '#14b4fc',
              strokeWeight: 0
            })
            that.zoneMarkerCircleObj[zoneKey] = b
        } else {
            zoneMarkerCircle.setCenter([gcj02Longitude, gcj02Latitude])
        }
      }

      for(let key in that.gpsObj) {
        let gps = that.gpsObj[key]
        let zoneMarker = that.zoneMarkerObj[key]
        let { gcj02Longitude, gcj02Latitude, friendly_name } = gps.attributes

        if (!zoneMarker) {
            var a = new AMap.LabelMarker({
              name: friendly_name,
              position: [gcj02Longitude, gcj02Latitude],
              zooms: [3, 20],
              opacity: 1,
              icon: {
                  type: 'image',
                  image: 'https://a.amap.com/jsapi_demos/static/images/poi-marker.png',
                  clipOrigin: [194, 92],
                  clipSize: [50, 68],
                  size: [25, 34],
                  anchor: 'bottom-center',
                  angel: 0,
                  retina: true
              },
              text: {
                  content: friendly_name,
                  direction: 'top',
                  offset: [0, -5],
                  style: {
                    fontSize: 13,
                    fontWeight: 'normal',
                    fillColor: '#fff',
                    padding: '2, 5',
                    backgroundColor: '#ff2a00'
                  }
              }
            })
            that.zoneMarkerObj[key] = a
            that.alayer.add(a);
        } else {
            zoneMarker.setPosition([gcj02Longitude, gcj02Latitude])
        }

      }
  }
  _loadMap(hass) {
    let that = this
    if (this.mapLoading) {return}

    this.mapLoading = true
    if (this.amap) {
      this.amap.destroy()
      this.amap = null
      this.alayer = null
      this.editZoneLayer = null
      this.zoneMarkerObj = {}
      this.zoneMarkerCircleObj = {}
    }
    let config = this.config
    window._AMapSecurityConfig = {
      securityJsCode: config.gaode_key_security_code,
    }
    AMapLoader.load({
      key: config.gaode_key,       // 申请好的Web端开发者Key，首次调用 load 时必填
    }).then((AMap)=>{
      let mapContainer = this.querySelector("#mapContainer");
      if (mapContainer) {
        this.amap = new AMap.Map(mapContainer, {
          center: this._getCenter(hass),
          zoom: 16,
          resizeEnable: true,
        });

        var layer = new AMap.LabelsLayer({
            zooms: [3, 20],
            zIndex: 1000,
            animation: false,
        });
        var editZoneLayer = new AMap.LabelsLayer({
            zooms: [3, 20],
            zIndex: 1000,
            animation: false,
            visible: false
        });
        this.amap.add(layer);
        this.amap.add(editZoneLayer);

        this.alayer = layer
        this.editZoneLayer = editZoneLayer

        this.amap.on('click', function(e) {
          console.log(that.zoneEdit, e)
          if (that.zoneEdit) {
            let lng = e.lnglat.lng
            let lat = e.lnglat.lat

            that.editMarker.setPosition([lng, lat])
            that.editMarkerCircle.setCenter([lng, lat])
            var llInput = that.querySelector("#ll_input")
            llInput.value = lng + "," + lat
          }
        })
        var a = function() {
          that._drawMap()
          that._drawWindow(hass)
        }

        this.mapLoading = false;
        this._calcGps(a)
      }
    }).catch((e)=>{
      console.error(e);  //加载错误提示
    });
  }
  setConfig(config) {
    if (!config.gaode_key) {
      throw new Error("请设置高德Key");
    }
    this.config = config;
  }
  getCardSize() {
    return 3;
  }
  _getCenter(hass) {
    let { states } = hass;
    let { center } = this.config
    // 中心点
    let entity = states[center]
    if (entity) {
      const { latitude, longitude } = entity.attributes;
      return [longitude, latitude]
    }
    return null
  }
}

customElements.define("dx-gaode-map-card", Ha_gaode);
