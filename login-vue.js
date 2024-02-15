import { projectUrl, promptLogIn } from "./firebase-network.js";

Vue.component('login-component', {
  props: {
    value: Object, // Should be a user object
  },
  methods: {
    // Adapted from https://simonkollross.de/posts/vuejs-using-v-model-with-objects-for-custom-components
    update(key, value) {
      this.$emit('input', { ...this.value, [key]: value })
    },
    async logOut() {
      const result = await firebase.auth().signOut();
      // Reset user id to indicate logged out.
      this.value.id = '';
    },
    promptLogIn,
    projectUrl
  },
  computed: {
  },
  template: `
  <div class="shadow-sm rounded my-3 p-3 border-0 bg-white space">

  <div class="row">
    <div class="col-md-6">

      <img src="assets/logo/vector/logo-256x64.svg" width="180px" height="45px">
      <h4 class="mt-3">Welcome, {{ value.name }}!</h4>
      <div v-if="value.id">

        <button class="btn btn-basic border rounded mb-3" @click="logOut">Log out</button>


      </div>
      <div v-else>
        <button class="btn btn-basic border rounded mb-3" @click="promptLogIn">Log in</button>
      </div>
    </div>
    <div class="col-md-6">

      <p><b>Projects</b></p>

      <ul>
        <li v-for="project in value.projects">
          <a :href="projectUrl(project.id)" target="_blank" rel="noopener noreferrer">
            {{ project.name }}
          </a>
        </li>
      </ul>
    </div>
  </div>

</div>
  `
});
