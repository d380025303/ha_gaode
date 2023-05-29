<!--
 * @Author        : dx
 * @Github        : https://github.com/d380025303
 * @Description   : 
 * @Date          : 2023-05-29 10:00:00
 * @LastEditors   : dx
 * @LastEditTime  : 2023-05-29 10:00:00
 -->

# Dx Gaode Map Card

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

基于高德地图API实现的Home Assistant前端卡片

+ 支持修改地点位置，修改地点范围（你将不用烦恼GPS与国内经纬度偏差）
+ 支持GPSLogger实时展示

## 更新
+ v1.0
    + 支持修改地点位置，修改地点范围（你将不用烦恼GPS与国内经纬度偏差）
    + 支持GPSLogger实时展示
    
## 预览

## 修改地点位置，范围
tip: 编辑后经纬度可直接点击地图设置

![](1.jpg)

## GPSLogger实时展示，zone位置展示
![](2.jpg)


## HACS 安装
搜索 ```DxGaodeMapCard```，点击安装即可

## 手动安装
1. 下载 `dx-gaode-map-card.js`
1. 复制到 `\config\www\ha_gaode\dx-gaode-map-card.js`
1. 添加资源
   ![](3.jpg)
1. 添加自定义卡片，使用以下配置：
    ```yaml
    type: custom:dx-gaode-map-card
    center: 
    gaode_key: 
    gaode_key_security_code: 
    ```

## 选项
tips: 高德Key，安全密钥 请前往https://console.amap.com/dev/key/app 申请

| 属性名 | 类型     | 默认     | 描述
| ---- |--------|--------| -----------
| type | string | **必填** | 卡片定义，固定写死 custom:dx-gaode-map-card 即可
| gaode_key | string | **必选** | 高德key
| gaode_key_security_code | string | **必选** | 高德安全秘钥 
| center | entity_id | 可选 | 初始化默认中心位置
