// 不使用 rest button
export const zoomInChartInteraction = {
  name: 'zoom-in-chart',
  content: {
    showEnable: [
      { trigger: 'plot:mouseenter', action: 'cursor:crosshair' },
      { trigger: 'plot:mouseleave', action: 'cursor:default' },
    ],
    start: [
      {
        trigger: 'plot:mousedown',
        action: ['brush-x:start', 'x-rect-mask:start', 'x-rect-mask:show'],
      },
    ],
    processing: [
      {
        trigger: 'plot:mousemove',
        action: ['x-rect-mask:resize'],
      },
    ],
    end: [
      {
        trigger: 'plot:mouseup',
        action: [
          'brush-x:filter',
          'brush-x:end',
          'x-rect-mask:end',
          'x-rect-mask:hide',
          // 'reset-button:show',
        ],
      },
    ],
    rollback: [
      {
        trigger: 'dblclick',
        action: ['brush-x:reset', 'reset-button:hide'],
      },
      // {
      //   trigger: 'reset-button:click',
      //   action: ['brush-x:reset', 'reset-button:hide'],
      // },
    ],
  }
}


