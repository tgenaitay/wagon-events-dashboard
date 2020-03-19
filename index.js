let BaaS = window.BaaS
let Events = new BaaS.TableObject('events')
let Signups = new BaaS.TableObject('signups')
let Attendees = new BaaS.TableObject('attendees')
let Drivers = new BaaS.TableObject('drivers')
// let cacheKey = 'ifanrx_clientID'

const Home = new Vue({
  el: '#root',
  data() {
    return {
      currentRoute: window.location.pathname,
      eventList: [],
      drivers: {},
      driver_names: [],
      disabled: 0,
      editingEvent: '',
      editForm: {
        id: '',
        name: '',
        date: '',
        city: '',
        driver: '',
        address: '',
        start_time: '',
        end_time: '',
        description: '',
        image: ''
      },
      image: '',
      signUps: [],
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
      console.log(event)
      this.editForm.id = event.id
      this.editForm.name = event.name
      this.editForm.date = event.date
      this.editForm.city = event.city
      this.editForm.driver = event.driver
      this.editForm.address = event.address
      this.editForm.start_time = event.start_time
      this.editForm.end_time = event.end_time
      this.editForm.description = event.description
      this.editForm.image = event.image
      this.openEditModal()
    },
    getDrivers() {
      let that = this
      Drivers.offset(0).limit(100).orderBy('-created_at').find().then(res => {
        res.data.objects.forEach(d => {
          that.drivers[d.full_name] = d.id
          that.driver_names.push(d.full_name)
        })
      }, err => {console.log('failed fetching drivers', err)})
    },
    deleteEvent(event) {
      Events.delete(event.id).then(() => {
        this.eventList = this.eventList.filter(v => {
          return v.id !== event.id
        })
      })
    },
    getEventList() {
      let that = this;
      let eventsLoaded = [];


      Events.offset(0).limit(1000).orderBy('-created_at').find().then(res => {
        res.data.objects.forEach(v => {
          let query = new BaaS.Query()
          query.compare('event_id', '=', Events.getWithoutData(v.id))

          let eventLoaded = new Promise((resolve, reject) => {
            Signups.setQuery(query).expand("events").find().then(res => {
              let count = res.data.objects.length
              let event = {
                id: v.id,
                name: v.name,
                date: v.date,
                city:  v.city,
                driver: Object.keys(that.drivers).find(key => that.drivers[key] === v.driver_id),
                address: v.address,
                description: v.description,
                start_time: v.start_time,
                end_time: v.end_time,
                rsvp: count,
                image: v.image
              };
              resolve({ date: new Date(event.date), event: event} );
            })
          });

          eventsLoaded.push(eventLoaded)
        })
        Promise.all(eventsLoaded).then((events) => {
          that.eventList = events.sort((a,b) => b.date - a.date).map(e => e.event);
        });
      });
    },
    getAttendees(event) {

      this.signUps = []

      let query = new BaaS.Query()
      query.compare('event_id', '=', Events.getWithoutData(event.id))

      Signups.setQuery(query).expand("events").find().then(res => {

        res.data.objects.forEach(v => {

          let query2 = new BaaS.Query()
          query2.compare('user_id', '=', v.user_id.id)

          console.log(v.user_id.id)
          const user = Attendees.setQuery(query2).find().then(res => {
            this.signUps.push({
              user_id: v.user_id.id,
              real_name: res.data.objects[0].real_name,
              email: res.data.objects[0].email,
              phone: res.data.objects[0].phone,
              occupation_tag: res.data.objects[0].occupation_tag
            })
          })
        })
        console.log(this.signUps)
        this.openSignupsModal()
      })
    },
    openEditModal() {
      this.image = ''
      $('#editModal').modal()
    },
    openLoginModal() {
      $('#loginModal').modal()
    },
    openRegisterModal() {
      $('#registerModal').modal()
    },
    openSignupsModal() {
      $('#signupsModal').modal()
    },
    handleEdit() {
      let that = this
      let record = Events.getWithoutData(this.editForm.id)

      // New data set

      record.set({
        name: this.editForm.name,
        date: this.editForm.date,
        city: this.editForm.city,
        driver_id: that.drivers[this.editForm.driver],
        address: this.editForm.address,
        start_time: this.editForm.start_time,
        end_time: this.editForm.end_time,
        description: this.editForm.description,
        image: this.editForm.image
      })

      // Upload to Minapp

      record.update().then(res => {
          // success
          const i = this.eventList.findIndex(x => x.id === this.editForm.id)
          Home.$set(Home.eventList, i, {
            name: this.editForm.name,
            date: this.editForm.date,
            city: this.editForm.city,
            driver: this.editForm.driver,
            address: this.editForm.address,
            start_time: this.editForm.start_time,
            end_time: this.editForm.end_time,
            description: this.editForm.description,
            rsvp: this.eventList[i].rsvp,
            image: this.editForm.image
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
      }, err => {
          // err
          window.alert('Login error, please try again')
        })
    },
    handleRegister() {
      BaaS.auth.register(this.registerForm).then(() => {
        $('#registerModal').modal('hide')
        this.init()
      }, err => {
          // err
          window.alert('Registration error, please try again')
        })
    },
    handleUpload(){
      console.log(this.$refs.file.files[0])
      // loading fileobject in local storage
      this.image = this.$refs.file.files[0].type + ' loaded!'

      let File = new BaaS.File()
      let fileParams = {fileObj:this.$refs.file.files[0]}

       File.upload(fileParams).then(res => {
        // OK

         console.log(res.path)

         // Setting new image in local data
         this.editForm.image = res.path

       }, err => {
       // HError
         window.alert("Image error")
      })

    },
    init() {
      this.getEventList()
      this.getDrivers()
      console.log(this.eventList)
    },
  },
  mounted() {
    // if (!localStorage.getItem(cacheKey)) {
    //   while (true) {
    //     let clientID = window.prompt('Please provide the clientID')  // 从 BaaS 后台获取 ClientID
    //     if (clientID && clientID.match(/\w{20}/)) {
    //       localStorage.setItem(cacheKey, clientID) // 若输入了错误的 clientID，可以清空 localStorage
    //       break
    //     }
    //   }
    // }
    BaaS.init("d06840973e93da8277d9") // clientID for this App
    BaaS.auth.getCurrentUser().then(() => {
      this.init()
    }).catch(e => {
      this.openLoginModal()
    })
  }
})

