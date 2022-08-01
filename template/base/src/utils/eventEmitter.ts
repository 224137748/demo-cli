type EventTypes = number | string | symbol

type EventEmitterProps = {
  on: (event: EventTypes, callback: Function) => EventEmitter
  emit: <T = any>(event: EventTypes, ...args: Array<T>) => EventEmitter
  once: (event: EventTypes, callback: Function) => EventEmitter
  off: (name: EventTypes, callback: Function) => boolean
}

type EventMap = Map<EventTypes, Set<Function>>

class EventEmitter implements EventEmitterProps {
  private map: EventMap
  constructor() {
    this.map = new Map()
  }

  on(event: EventTypes, callback: Function) {
    if (this.map.has(event)) {
      const fns = this.map.get(event)
      fns?.add(callback)
    } else {
      this.map.set(event, new Set([callback]))
    }
    return this
  }

  emit<T = any>(event: EventTypes, ...args: Array<T>) {
    if (this.map.has(event)) {
      const fns = this.map.get(event) as Set<Function>
      Array.from(fns).forEach((fn) => fn.apply(this, args))
    } else {
      console.warn(`Sorry, this event '${String(event)}' has not been registered!!`)
    }

    return this
  }

  once(event: EventTypes, callback: Function) {
    const _that = this
    // 创建一个函数，先绑定，执行时再删除
    const handler = function () {
      _that.off(event, handler)
      callback.apply(_that, arguments)
    }
    this.on(event, handler)

    return this
  }

  off(event: EventTypes, callback: Function): boolean {
    if (this.map.has(event)) {
      const fns = this.map.get(event) as Set<Function>
      if (fns?.has(callback)) {
        return fns?.delete(callback)
      }
      return false
    }
    return false
  }
}

export default new EventEmitter()
