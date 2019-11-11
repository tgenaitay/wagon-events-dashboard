let BaaS = window.BaaS
let Events = new BaaS.TableObject('events')
let Signups = new BaaS.TableObject('signups')
let cacheKey = 'ifanrx_clientID'

const Home = new Vue({
  el: '#root',
  data() {
    return {
      currentRoute: window.location.pathname,
      eventList: [],
      editingEvent: '',
      editForm: {
        id: '',
        name: '',
        date: '',
      },
      loginForm: {
        email: '',
        password: '',
      },
      registerForm: {
        email: '',
        password: '',
      }
    }
  },
  methods: {
    editEvent(event) {
      this.openEditModal()
      this.editForm.id = event.id
      this.editForm.name = event.name
      this.editForm.date = event.date
    },
    deleteEvent(event) {
      Events.delete(event.id).then(() => {
        this.eventList = this.eventList.filter(v => {
          return v.id !== event.id
        })
      })
    },
    getEventList() {
      Events.offset(0).limit(1000).orderBy('-id').find().then(res => {
        res.data.objects.forEach(v => {
          let query = new BaaS.Query()
          query.compare('event_id', '=', Events.getWithoutData(v.id))

          Signups.setQuery(query).expand("events").find().then(res => {
            let count = res.data.objects.length
              this.eventList.push({
              id: v.id,
              name: v.name,
              date: v.date,
              rsvp: count
              })
          })
        })
      })
    },
    openEditModal() {
      $('#editModal').modal()
    },
    openLoginModal() {
      $('#loginModal').modal()
    },
    openRegisterModal() {
      $('#registerModal').modal()
    },
    handleEdit() {
      console.log(this.editForm)
      let record = Events.getWithoutData(this.editForm.id)
      console.log(record)
        record.set({
          name: this.editForm.name,
          date: this.editForm.date
        })
        record.update().then(res => {
          // success
          const i = this.eventList.findIndex(x => x.id === this.editForm.id)
          Home.$set(Home.eventList, i, {
          name: this.editForm.name,
          date: this.editForm.date
        })
          $('#editModal').modal('hide')
        }, err => {
          // err
          window.alert('Update error, please try again')

        })
    },
    handleLogin() {
      BaaS.auth.login(this.loginForm).then(() => {
        $('#loginModal').modal('hide')
        this.init()
      })
    },
    handleRegister() {
      BaaS.auth.register(this.registerForm).then(() => {
        $('#registerModal').modal('hide')
        this.init()
      })
    },
    init() {
      this.getEventList()
      console.log(this.eventList)
    },
  },
  mounted() {
    if (!localStorage.getItem(cacheKey)) {
      while (true) {
        let clientID = window.prompt('Please provide the clientID')  // 从 BaaS 后台获取 ClientID
        if (clientID && clientID.match(/\w{20}/)) {
          localStorage.setItem(cacheKey, clientID) // 若输入了错误的 clientID，可以清空 localStorage
          break
        }
      }
    }
    BaaS.init(localStorage.getItem(cacheKey))
    BaaS.auth.getCurrentUser().then(() => {
      this.init()
    }).catch(e => {
      this.openLoginModal()
    })
  }
})

