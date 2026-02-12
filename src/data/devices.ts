// 设备数据配置文件

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = {
	[categoryName: string]: Device[];
} & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = {
	PC: [
		{
			name: "联想小新Pro 14 2024",
			image: "/images/device/xiaoxinpro14.webp",
			specs: "Gray / 24G + 1TB",
			description: "搭载AMD Ryzen7 8745H处理器与杜比音效，配备100W快充",
			link: "https://www.bilibili.com/video/BV1um411S7U4",
		},
	],
	Drone: [
		{
			name: "DJI Mini2",
			image: "/images/device/mini2.jpg",
			specs: "标准套装",
			description:
				"搭载1/2.3英寸CMOS传感器，支持4K视频拍摄和31分钟飞行时间",
			link: "https://store.dji.com/cn/product/mini-2",
		},
	],
	Osmo: [
		{
			name: "DJI Osmo pocket 3",
			image: "/images/device/pocket.webp",
			specs: "标准套装",
			description:
				"搭载1英寸CMOS传感器，支持4K60FPS视频拍摄，配备三轴机械云台",
			link: "https://www.dji.com/cn/osmo-pocket-3",
		},
	],
};
