import "https://webapi.amap.com/loader.js"

const random_color = [
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#ff0000",
  "#ff9900",
  "#20124d",
  "#660000",
]

const zone_icon = {
  type: 'image',
  image: 'https://a.amap.com/jsapi_demos/static/images/poi-marker.png',
  clipOrigin: [194, 92],
  clipSize: [50, 68],
  size: [25, 34],
  anchor: 'bottom-center',
  angel: 0,
  retina: true
}

const zone_text = {
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

const gps_icon = {
  type: 'image',
  image: 'https://a.amap.com/jsapi_demos/static/images/poi-marker.png',
  clipOrigin: [194, 92],
  clipSize: [50, 68],
  size: [25, 34],
  anchor: 'bottom-center',
  angel: 0,
  retina: true
}

const gps_test = {
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

const init_html = `
<div id="dxMapDiv" class="dxAmap" style="height: 100%">
  <div style="display: flex;height: 100%">
    <div style="height: 100%;width: 100%;" id="mapContainer" class="mapContainer"></div>
    <div id="maxDiv" style="flex: 1;position: absolute;top: 200px; left: 100px;background-color: white;z-index: 5;padding: 8px">
      <div style="display: flex;margin-bottom: 8px">
        <button id="containerMin">最小化</button>
      </div>

      <div style="margin-bottom: 8px">
        <div style="display: flex;align-items: center;">
          <div style="margin-right: 8px">地图操作</div>
          <div>您刚刚点击了坐标：<span id="click_ll_span" style="user-select: text;"></span></div>
        </div>
        <div>
          地图搜索：<input type="text" id="map_search_input" name="map_search" >
        </div>
        <div style="display: flex;align-items: center;justify-content: start;">
          <div style="display: flex;align-items: center;margin-right: 8px">
            <input type="checkbox" id="satellite_input" name="satellite" >
            <span>卫星</span>
          </div>
          <div style="display: flex;align-items: center;margin-right: 8px">
            <input type="checkbox" id="roadnet_input" name="roadnet" >
            <span>路网</span>
          </div>
          <div style="display: flex;align-items: center;margin-right: 8px">
            <input type="checkbox" id="traffic_input" name="traffic" >
            <span>实时交通</span>
          </div>
        </div>
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

      <div id="gpsDiv" style="margin-bottom: 8px">
        <div style="flex: 1">GPS 位置列表</div>
        <table border="1" id="gpsList">

        </table>
        <div style="display: none" id="gps_set">
          <div>GPS操作</div>
          <div style="display: none">
            <input id="gps_entity_id_post_input" type="text" name="gps_entity_id_post" />
          </div>
          <div>
            <span>名称：</span>
            <span id="gps_friendly_name_div"></span>
          </div>
          <div>
            <button id="gps_set_cancel">取消</button>
            <button id="gps_set_trajectory">路径轨迹</button>
          </div>
        </div>
      </div>
    </div>
    <div id="minDiv" style="flex: 1;position: absolute;top: 200px; left: 100px;background-color: white;z-index: 5;padding: 8px;display: none">
        <button id="containerMax">还原</button>
    </div>
  </div>
</div>
`

class Ha_gaode extends HTMLElement {
  mapLoading = false
  zoneEdit = false
  gpsEdit = false
  editMarker = null
  editMarkerCircle = null
  amap = null
  zoneObj = {}
  gpsObj = {}
  zoneMarkerObj = {}
  zoneMarkerCircleObj = {}
  gpsCache = {}
  gpsList = []
  carMarker = null
  carPolyline = null
  carPassedPolyline = null
  set hass(hass) {
    console.log(hass)
    let that = this
    // Initialize the content if it's not there yet.
    this._handleHass(hass)
    if (!this.content) {
      this.innerHTML = init_html;
      this.content = this.querySelector("#dxMapDiv")
      that._loadMap(hass)
      that._drawOnce(hass)
    }
    this._drawWindow(hass)
    this._drawMap(hass)
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
      const { gcj02_longitude, gcj02_latitude, friendly_name, radius } = zone.attributes
      var trE = document.createElement(`tr`)
      var key = zoneKey.replaceAll('\.', '')
      trE.innerHTML = `
          <td >${friendly_name}</td>
          <td style='cursor: pointer' id=${key + '_ll'}>${gcj02_longitude + "," + gcj02_latitude}</td>
          <td >${radius}</td>
          <td>
            <button id=${key + '_edit'} dx_entity_id=${zoneKey}>编辑</button>
          </td>
      `
      zoneContainer.appendChild(trE)
      let zoneKeyLl = this.querySelector(`#${key}_ll`)
      zoneKeyLl.addEventListener('click', () => {
        this.amap.setCenter([gcj02_longitude, gcj02_latitude])
      });
      let zoneKeyEdit = this.querySelector(`#${key}_edit`)
      zoneKeyEdit.addEventListener('click', () => {
        const entityId = zoneKeyEdit.getAttribute('dx_entity_id')
        const zone = this.zoneObj[entityId]
        const { friendly_name, gcj02_longitude, gcj02_latitude, radius } = zone.attributes

        this._showZoneForm({
          position: [gcj02_longitude, gcj02_latitude],
          friendly_name: friendly_name,
          entity_id: entityId,
          radius
        })

        var zomeForm = this._getZoneForm()
        zomeForm.entity_id_post_input.value = zone.entity_id
        zomeForm.friendly_name_input.value = friendly_name
        zomeForm.ll_input.value = gcj02_longitude + "," + gcj02_latitude
        zomeForm.radius_input.value = radius
      });
    }

    // GPS
    let gpsList = this.querySelector("#gpsList")
    gpsList.innerHTML = ''
    var rootTr = document.createElement(`tr`)
    rootTr.innerHTML = `
      <td>名称</td>
      <td>最新经纬度</td>
      <td>操作</td>
    `
    gpsList.appendChild(rootTr)
    for(let gpsKey in this.gpsObj) {
      const gps = this.gpsObj[gpsKey]
      const { gcj02_longitude, gcj02_latitude, friendly_name } = gps.attributes

      var trE = document.createElement(`tr`)
      var key = gpsKey.replaceAll('\.', '')
      trE.innerHTML = `
          <td >${friendly_name}</td>
          <td style='cursor: pointer' id=${key + '_ll'}>${gcj02_longitude + "," + gcj02_latitude}</td>
          <td>
            <button id=${key + '_oper'} dx_entity_id=${gpsKey}>操作</button>
          </td>
      `
      gpsList.appendChild(trE)
      let gpsView = this.querySelector(`#${key}_ll`)
      gpsView.addEventListener('click', () => {
        this.amap.setCenter([gcj02_longitude, gcj02_latitude])
      })
      let gpsOper = this.querySelector(`#${key}_oper`)
      gpsOper.addEventListener('click', () => {
        const entityId = gpsOper.getAttribute('dx_entity_id')
        const gps = this.gpsObj[entityId]
        const { friendly_name, gcj02_longitude, gcj02_latitude } = gps.attributes

        this._showGpsForm({
          position: [gcj02_longitude, gcj02_latitude],
          friendly_name: friendly_name,
          entity_id: entityId,
        })

        var gpsForm = this._getGpsForm()
        gpsForm.gps_entity_id_post_input.value = gps.entity_id
        gpsForm.gps_friendly_name_div.innerHTML = friendly_name
      });
    }
  }
  _toTrajectory(arr) {
    if (arr.length > 0) {
      let that = this
      this.amap.setZoomAndCenter(17, arr[0])
      this.carPolyline.setPath(arr)
      this.carPolyline.show()
      this.carPassedPolyline.show()
      that.carMarker.moveAlong(arr, 200);
    }
  }
  _closeTrajectory() {
      this.carMarker.hide()
      this.carPolyline.hide()
      this.carPassedPolyline.hide()
  }
  _drawOnce(hass) {
    let zoneSetCancel = this.querySelector("#zoneSetCancel")
    zoneSetCancel.addEventListener('click', () => {
      this._hideZoneForm()
    });

    let zoneSetCommit = this.querySelector("#zoneSetCommit")
    zoneSetCommit.addEventListener('click', () => {
      var valueObj = this._getZoneFormValues()
      // const zone = this.zoneObj[valueObj.entity_id]
      hass.callApi('post', 'dx/zone/save', {
        ...valueObj
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

    let gps_set_cancel = this.querySelector("#gps_set_cancel")
    gps_set_cancel.addEventListener('click', () => {
      this._hideGpsForm()
    });

    let gpsSetTrajectory = this.querySelector("#gps_set_trajectory")
    gpsSetTrajectory.addEventListener('click', async() => {
      var valueObj = this._getGpsFormValues()
      let msg = await hass.callApi('get', `dx/gps/gps_list_by_entity_id?entity_id=${valueObj.entity_id}`)
      console.log(msg)
      var arr = []
      for (let i = 0; i < msg.length; i++) {
        const element = msg[i];
        arr.push([parseFloat(element.gcj02_longitude), element.gcj02_latitude])
      }
      this._toTrajectory(arr)
    });
    let satellite_input = this.querySelector("#satellite_input")
    satellite_input.addEventListener('change', (e) => {
      if (satellite_input.checked) {
        this.amap.add(this.satelliteLayer)
      } else {
        this.amap.remove(this.satelliteLayer)
      }
    });
    let roadnet_input = this.querySelector("#roadnet_input")
    roadnet_input.addEventListener('change', (e) => {
      if (roadnet_input.checked) {
        this.amap.add(this.roadnetLayer)
      } else {
        this.amap.remove(this.roadnetLayer)
      }
    });
    let traffic_input = this.querySelector("#traffic_input")
    traffic_input.addEventListener('change', (e) => {
      if (traffic_input.checked) {
        this.amap.add(this.trafficLayer)
      } else {
        this.amap.remove(this.trafficLayer)
      }
    });
    // map_search_input.addEventListener('change', (e) => {
      // if (traffic_input.checked) {
      //   this.amap.add(this.trafficLayer)
      // } else {
      //   this.amap.remove(this.trafficLayer)
      // }
    // });
  }
  _showGpsForm(obj) {
    this.amap.setCenter(obj.position)
    let gpsSet = this.querySelector("#gps_set")
    gpsSet.style = "display: block"
    this.gpsEdit = true
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
    this.editMarkerCircle = new AMap.Circle({
      map: this.amap,
      center: obj.position,
      radius: obj.radius,
      fillOpacity: 0.3,
      strokeColor: '#14b4fc',
      strokeOpacity: 0.3,
      fillColor: '#14b4fc',
      strokeWeight: 0
    })
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
    this.editMarkerCircle.setMap(null)
    this.editMarkerCircle = null
    for (let k in this.zoneMarkerCircleObj) {
      this.zoneMarkerCircleObj[k].show()
    }
  }
  _hideGpsForm() {
    let gpsSet = this.querySelector("#gps_set")
    gpsSet.style = "display: none"
    this.gpsEdit = false
    this._clearGpsFormValues()
    this._closeTrajectory()
  }
  _getGpsForm() {
    return {
      gps_entity_id_post_input: this.querySelector("#gps_entity_id_post_input"),
      gps_friendly_name_div: this.querySelector("#gps_friendly_name_div"),
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
      gcj02_longitude: llArray[0],
      gcj02_latitude: llArray[1],
      radius: parseInt(zomeForm.radius_input.value),
    }
  }
  _getGpsFormValues() {
    var gpsForm = this._getGpsForm()
    return {
      entity_id: gpsForm.gps_entity_id_post_input.value,
    }
  }
  _clearZoneFormValues() {
    var zomeForm = this._getZoneForm()
    zomeForm.entity_id_post_input.value = null
    zomeForm.friendly_name_input.value = null
    zomeForm.ll_input.value = null
    zomeForm.radius_input.value = null
  }
  _clearGpsFormValues() {
    var gpsForm = this._getGpsForm()
    gpsForm.gps_entity_id_post_input.value = null
    gpsForm.gps_friendly_name_div.innerHTML = null
  }
  _handleHass(hass) {
    let that = this
    let { states } = hass;
    let gpsList = []
    for(let stateKey in states) {
      if (stateKey.startsWith('zone')) {
        let entity = states[stateKey]
        let { longitude, latitude, gcj02_longitude, gcj02_latitude } = entity.attributes
        if (longitude && latitude) {
          if (gcj02_longitude && gcj02_latitude) {
            // do nothing
          } else {
            var g = this.gpsCache[longitude + "," + latitude]
            if (g) {
              entity.gcj02_longitude = g.longitude
              entity.gcj02_latitude = g.latitude
            } else {
              gpsList.push([longitude, latitude])
            }
          }
        }
        this.zoneObj[stateKey] = entity
      } else if (stateKey.startsWith('device_tracker')) {
        let entity = states[stateKey]
        if (entity.attributes.source_type = 'gps') {
          let { longitude, latitude, gcj02_longitude, gcj02_latitude } = entity.attributes
          if (longitude && latitude) {
            if (gcj02_longitude && gcj02_latitude) {
              // do nothing
            } else{
              var g = this.gpsCache[longitude + "," + latitude]
              if (g) {
                entity.gcj02_longitude = g.longitude
                entity.gcj02_latitude = g.latitude
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
              zone.attributes.gcj02_longitude = cache.longitude
              zone.attributes.gcj02_latitude = cache.latitude
            }
            that.zoneObj[zoneKey] = zone
          }
          for(let gpsKey in that.gpsObj) {
            let gps = that.gpsObj[gpsKey]
            let { longitude, latitude } = gps.attributes
            let cache = that.gpsCache[longitude + "," + latitude]
            if (cache) {
              gps.attributes.gcj02_longitude = cache.longitude
              gps.attributes.gcj02_latitude = cache.latitude
            }
            that.gpsObj[gpsKey] = gps
          }
          if (f) {
            f(config)
          }
        }
        that.gpsList = []
      });
    } else if (this.amap) {
      if (f) {
        f(config)
      }
    }
  }
  _drawMap() {
    if (!this.amap) return
    let that = this;
    // const { hass, that } = config
     // 设置markder
    for(let zoneKey in that.zoneObj) {
        let zoneMarker = that.zoneMarkerObj[zoneKey]
        let zone = that.zoneObj[zoneKey]
        let { gcj02_longitude, gcj02_latitude, friendly_name, radius } = zone.attributes
        if (!zoneMarker) {
            var a = new AMap.LabelMarker({
              name: friendly_name,
              position: [gcj02_longitude, gcj02_latitude],
              zooms: [3, 20],
              opacity: 1,
              icon: zone_icon,
              text: {
                ...zone_text,
                content: friendly_name,
              }
            })
            that.zoneMarkerObj[zoneKey] = a
            that.alayer.add(a);
        } else {
          zoneMarker.setPosition([gcj02_longitude, gcj02_latitude])
          zoneMarker.setText({...zone_text, content: friendly_name})
        }

        let zoneMarkerCircle = that.zoneMarkerCircleObj[zoneKey]
        if (!zoneMarkerCircle) {
            var b = new AMap.Circle({
              map: that.amap,
              center: [gcj02_longitude, gcj02_latitude],
              radius,
              fillOpacity: 0.3,
              strokeColor: '#14b4fc',
              strokeOpacity: 0.3,
              fillColor: '#14b4fc',
              strokeWeight: 0
            })
            that.zoneMarkerCircleObj[zoneKey] = b
        } else {
            zoneMarkerCircle.setCenter([gcj02_longitude, gcj02_latitude])
            zoneMarkerCircle.setRadius(radius)
        }
      }

      for(let key in that.gpsObj) {
        let gps = that.gpsObj[key]
        let zoneMarker = that.zoneMarkerObj[key]
        let { gcj02_longitude, gcj02_latitude, friendly_name } = gps.attributes

        if (!zoneMarker) {
            var a = new AMap.LabelMarker({
              name: friendly_name,
              position: [gcj02_longitude, gcj02_latitude],
              zooms: [3, 20],
              opacity: 1,
              icon: gps_icon,
              text: {
                ...gps_test,
                content: friendly_name
              }
            })
            that.zoneMarkerObj[key] = a
            that.alayer.add(a);
        } else {
          zoneMarker.setPosition([gcj02_longitude, gcj02_latitude])
          zoneMarker.setText({...gps_test, content: friendly_name})
        }

      }
  }
  _configMap(hass) {
    const that = this;
    let mapContainer = this.querySelector("#mapContainer");
    if (mapContainer) {
      this.amap = new AMap.Map(mapContainer, {
        center: this._getCenter(hass),
        zoom: 16,
        resizeEnable: true,
        animateEnable: false,
        jogEnable: false
      });

      const layer = new AMap.LabelsLayer({
        zooms: [3, 20],
        zIndex: 1000,
        animation: false,
        collision: false
      });
      const editZoneLayer = new AMap.LabelsLayer({
        zooms: [3, 20],
        zIndex: 1000,
        animation: false,
        visible: false,
        collision: false
      });
      this.amap.add(layer);
      this.amap.add(editZoneLayer);

      this.satelliteLayer= new AMap.TileLayer.Satellite();
      this.roadnetLayer = new AMap.TileLayer.RoadNet()
      this.trafficLayer = new AMap.TileLayer.Traffic()

      let map_search_input = this.querySelector("#map_search_input");
      AMap.plugin('AMap.Autocomplete',function(){//异步加载插件
        const auto = new AMap.Autocomplete({
          input: map_search_input
        });
        auto.on('select', function (data) {
          that.amap.setCenter(data.poi.location)
        })
      });

      // 轨迹
      this.carMarker = new AMap.Marker({
        map: this.amap,
        visible: false,
        icon: "https://webapi.amap.com/images/car.png",
        offset: new AMap.Pixel(-26, -13),
        autoRotation: true,
        angle:-90,
      })
      this.carMarker.on('moving', function (e) {
        that.carPassedPolyline.setPath(e.passedPath);
      });
      this.carPolyline = new AMap.Polyline({
        map: this.amap,
        showDir:true,
        strokeColor: "#28F",
        strokeWeight: 6,
      });
      this.carPolyline.hide()

      this.carPassedPolyline = new AMap.Polyline({
        map: this.amap,
        strokeColor: "#AF5",  //线颜色
        strokeWeight: 6,      //线宽
      });
      this.carPassedPolyline.hide()

      this.alayer = layer
      this.editZoneLayer = editZoneLayer

      this.amap.on('click', function (e) {
        const lng = e.lnglat.lng
        const lat = e.lnglat.lat
        if (that.zoneEdit) {
          that.editMarker.setPosition([lng, lat])
          that.editMarkerCircle.setCenter([lng, lat])
          const llInput = that.querySelector("#ll_input")
          llInput.value = lng + "," + lat
        } else {
          const click_ll_span = that.querySelector("#click_ll_span");
          click_ll_span.innerHTML = lng + "," + lat
          click_ll_span.style.color = random_color[Math.round(Math.random()*random_color.length - 1)]
        }
      })
      var a = function() {
        that._drawMap()
        that._drawWindow(hass)
      }

      this.mapLoading = false;
      this._calcGps(a)
    }
  }
  _loadMap(hass) {
    console.log("_loadMap...")
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
      this._configMap(hass)
      return;
    }
    let config = this.config
    window._AMapSecurityConfig = {
      securityJsCode: config.gaode_key_security_code,
    }
    AMapLoader.load({
      key: config.gaode_key,       // 申请好的Web端开发者Key，首次调用 load 时必填
    }).then((AMap)=>{
      this._configMap(hass)
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
      const { gcj02_latitude, gcj02_longitude } = entity.attributes;
      if (gcj02_latitude && gcj02_longitude) {
        return [gcj02_longitude, gcj02_latitude]
      }
    }
    return null
  }
}

customElements.define("dx-gaode-map-card", Ha_gaode);
