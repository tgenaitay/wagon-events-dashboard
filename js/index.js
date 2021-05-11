let BaaS = window.BaaS
let Events = new BaaS.TableObject('events')
let Signups = new BaaS.TableObject('signups')
let Attendees = new BaaS.TableObject('attendees')
let Drivers = new BaaS.TableObject('drivers')
// let cacheKey = 'ifanrx_clientID'

const dateFilter = function(value) {
  const date = new Date(value)
  return date.toLocaleDateString(['en-US'], {month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})
}

const Home = new Vue({
  el: '#root',
  filters: {
    dateFormat: dateFilter
  },
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
        clipboard: '',
        start_time: '',
        end_time: '',
        description: '',
        image: '',
        price: 0
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
      this.editForm.id = event.id
      this.editForm.name = event.name
      this.editForm.date = event.date
      this.editForm.city = event.city
      this.editForm.driver = event.driver
      this.editForm.address = event.address
      this.editForm.clipboard = event.clipboard
      this.editForm.start_time = event.start_time
      this.editForm.end_time = event.end_time
      this.editForm.description = event.description
      this.editForm.image = event.image
      this.editForm.price = Number.parseInt(event.price, 10) || 0
      this.editForm.notify = false
      this.editForm.private = event.private
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
      let go = confirm("Please confirm you want to delete this event");
      if (go == true) {
              Events.delete(event.id).then(() => {
                this.eventList = this.eventList.filter(v => {
                  return v.id !== event.id
                })
              })
      }
    },
    getEventList() {
      let that = this;
      let eventsLoaded = [];


      Events.offset(0).limit(1000).orderBy('-created_at').find().then(res => {
        res.data.objects.forEach(v => {
          let query = new BaaS.Query()
          query.compare('event_id', '=', Events.getWithoutData(v.id))

          let eventLoaded = new Promise((resolve, reject) => {
            Signups.setQuery(query).expand("events").limit(1000).find().then(res => {
              let count = res.data.objects.length
              let event = {
                id: v.id,
                name: v.name,
                date: v.date,
                city:  v.city,
                driver: Object.keys(that.drivers).find(key => that.drivers[key] === v.driver_id),
                address: v.address,
                clipboard: v.clipboard,
                description: v.description,
                start_time: v.start_time,
                end_time: v.end_time,
                price: v.price,
                private: v.private,
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

      Signups.setQuery(query).expand("events").limit(1000).orderBy('created_at').find().then(res => {

        //listing all sign ups for the event we're interested in

        res.data.objects.forEach(v => {

          // for each sign up, finding the attendees personal information

          let query2 = new BaaS.Query()
          query2.compare('user_id', '=', v.user_id.id)
          const user = Attendees.setQuery(query2).find().then(res => {

            this.signUps.push({
              user_id: v.user_id.id,
              created_at: new Date(v.created_at * 1000),
              real_name: res.data.objects[0].real_name,
              email: res.data.objects[0].email,
              phone: res.data.objects[0].phone,
              lead: res.data.objects[0].lead,
              mailing: res.data.objects[0].mailing
            })

          })
        })
        console.log(this.signUps)
        this.openSignupsModal()
      })
    },
    downloadAttendees() {
      let data = this.signUps;

      let csv = '';

      csv += 'User ID' + ';' + 'Registration' + ';' + 'Name' + ';' + 'Email' + ';' + 'Phone' + ';' + 'Lead' + ';' + 'Mailing'

      csv += '\r\n';

      for(let row = 0; row < data.length; row++){
          let keysAmount = Object.keys(data[row]).length
          let keysCounter = 0
           for(let key in data[row]){
               csv += data[row][key] + (keysCounter+1 < keysAmount ? ';' : '\r\n' )
               keysCounter++
           }
          keysCounter = 0
      }

      console.log(csv)

      let link = document.createElement('a')
      link.id = 'download-csv'
      link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      link.setAttribute('download', 'attendees.csv');
      document.body.appendChild(link)
      document.querySelector('#download-csv').click()

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
        clipboard: this.editForm.clipboard,
        start_time: this.editForm.start_time,
        end_time: this.editForm.end_time,
        description: this.editForm.description,
        image: this.editForm.image,
        notify: this.editForm.notify,
        private: this.editForm.private,
        price: Number.parseInt(this.editForm.price, 10)
      })

      // Upload to Minapp

      record.update().then(res => {
          // success
          const i = this.eventList.findIndex(x => x.id === this.editForm.id)
          Home.$set(Home.eventList, i, {
            id: this.editForm.id,
            name: this.editForm.name,
            date: this.editForm.date,
            city: this.editForm.city,
            driver: this.editForm.driver,
            address: this.editForm.address,
            clipboard: this.editForm.clipboard,
            start_time: this.editForm.start_time,
            end_time: this.editForm.end_time,
            description: this.editForm.description,
            rsvp: this.eventList[i].rsvp,
            image: this.editForm.image,
            price: this.editForm.price,
            private: this.editForm.private
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
    fetch('https://hzcx1ko8.minapp-faas.com/prod/')
      .then(res => res.json())
      .then(data => {
        BaaS.init(data.minapp)
        BaaS.auth.getCurrentUser().then(() => {
          this.init()
        }).catch(e => {
          this.openLoginModal()
        })
      })
  }
})
